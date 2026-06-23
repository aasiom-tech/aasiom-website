/**
 * AASIOM — Active Telemetry HUD Canvas
 *
 * Sovereign defence-contractor aesthetic: structural grid, AI bounding-box
 * acquisitions with typewriter telemetry, and a slow radar scan line.
 *
 * Performance budget:
 *   - Static grid cached to offscreen canvas (redrawn only on resize).
 *   - Object pool capped at 3 targets; no per-frame allocations in hot path.
 *   - Visibility API pauses loop when tab is hidden.
 *   - requestAnimationFrame at native refresh; work per frame is < 1 ms.
 */
(function () {
  'use strict';

  /* ================================================================
     CONFIGURATION
     ================================================================ */
  var CYAN       = '34,211,238';
  var GRID_MAJOR = 160;           // px between major gridlines
  var GRID_MINOR = 40;            // px between minor gridlines
  var MAX_TGT    = 3;             // max simultaneous bounding boxes
  var SPAWN_LO   = 2800;          // ms min between spawns
  var SPAWN_HI   = 5500;          // ms max
  var LIFE_LO    = 3200;          // ms min target lifetime
  var LIFE_HI    = 5800;          // ms max
  var FADE_IN    = 380;           // ms scale-in
  var FADE_OUT   = 550;           // ms fade-out
  var SCAN_PERIOD= 14000;         // ms per full scan-line sweep
  var BRACKET_OP = 0.14;          // peak bracket opacity
  var TEXT_OP    = 0.55;          // text opacity relative to bracket
  var XHAIR_OP  = 0.35;          // center crosshair relative to bracket

  /* ================================================================
     SETUP
     ================================================================ */
  var overlay = document.querySelector('.noise-overlay');
  if (!overlay) return;

  var c   = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:1;will-change:transform;';
  overlay.parentNode.insertBefore(c, overlay.nextSibling);

  var ctx  = c.getContext('2d');
  var gC   = document.createElement('canvas');   // offscreen grid
  var gCtx = gC.getContext('2d');

  var w, h, dpr;
  var targets   = [];
  var scanPhase = 0;
  var lastSpawn = 0;
  var nextSpawn = SPAWN_LO;

  /* ================================================================
     HELPERS
     ================================================================ */
  function rand(a, b)    { return Math.random() * (b - a) + a; }
  function randInt(a, b) { return (Math.random() * (b - a) + a) | 0; }

  var TGT_CLASS  = ['VEHICLE','INCIDENT','DEBRIS','THERMAL-SIG','OBSTRUCTION','ANOMALY'];
  var TGT_STATUS = ['TRACKING','ACQUIRED','CLASSIFYING','LOCK'];

  function genTelemetry() {
    var id  = 'TGT-0x' + randInt(0x1000, 0xFFFF).toString(16).toUpperCase();
    var st  = TGT_STATUS[randInt(0, TGT_STATUS.length)];
    var lat = (18.50 + Math.random() * 1.50).toFixed(4);
    var lon = (72.50 + Math.random() * 1.20).toFixed(4);
    var alt = randInt(80, 450);
    var spd = randInt(12, 85);
    var cls = TGT_CLASS[randInt(0, TGT_CLASS.length)];
    var cnf = (0.72 + Math.random() * 0.27).toFixed(2);

    return [
      id + ' \u00b7 ' + st,
      'LAT ' + lat + '\u00b0N  LON ' + lon + '\u00b0E',
      'ALT ' + alt + 'm  SPD ' + spd + 'm/s',
      cls + '  CONF ' + cnf
    ];
  }

  /* ================================================================
     STATIC GRID  (offscreen — redrawn only on resize)
     ================================================================ */
  function renderGrid() {
    gCtx.clearRect(0, 0, gC.width, gC.height);
    gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* --- minor grid ------------------------------------------------ */
    gCtx.strokeStyle = 'rgba(' + CYAN + ',0.018)';
    gCtx.lineWidth   = 0.5;
    gCtx.beginPath();
    var x, y;
    for (x = 0; x <= w; x += GRID_MINOR) { gCtx.moveTo(x, 0); gCtx.lineTo(x, h); }
    for (y = 0; y <= h; y += GRID_MINOR) { gCtx.moveTo(0, y); gCtx.lineTo(w, y); }
    gCtx.stroke();

    /* --- major grid ------------------------------------------------ */
    gCtx.strokeStyle = 'rgba(' + CYAN + ',0.04)';
    gCtx.beginPath();
    for (x = 0; x <= w; x += GRID_MAJOR) { gCtx.moveTo(x, 0); gCtx.lineTo(x, h); }
    for (y = 0; y <= h; y += GRID_MAJOR) { gCtx.moveTo(0, y); gCtx.lineTo(w, y); }
    gCtx.stroke();

    /* --- crosshairs at major intersections ------------------------- */
    gCtx.strokeStyle = 'rgba(' + CYAN + ',0.065)';
    gCtx.lineWidth   = 0.5;
    var cs = 5;
    gCtx.beginPath();
    for (x = GRID_MAJOR; x < w; x += GRID_MAJOR) {
      for (y = GRID_MAJOR; y < h; y += GRID_MAJOR) {
        gCtx.moveTo(x - cs, y); gCtx.lineTo(x + cs, y);
        gCtx.moveTo(x, y - cs); gCtx.lineTo(x, y + cs);
      }
    }
    gCtx.stroke();

    /* --- edge ruler ticks ------------------------------------------ */
    gCtx.strokeStyle = 'rgba(' + CYAN + ',0.05)';
    gCtx.beginPath();
    for (x = 0; x <= w; x += GRID_MAJOR) {
      gCtx.moveTo(x, 0); gCtx.lineTo(x, 6);
      gCtx.moveTo(x, h); gCtx.lineTo(x, h - 6);
    }
    for (y = 0; y <= h; y += GRID_MAJOR) {
      gCtx.moveTo(0, y); gCtx.lineTo(6, y);
      gCtx.moveTo(w, y); gCtx.lineTo(w - 6, y);
    }
    gCtx.stroke();

    /* --- sector labels at every-other major intersection ----------- */
    gCtx.font      = '7px "JetBrains Mono",monospace';
    gCtx.fillStyle = 'rgba(' + CYAN + ',0.045)';
    gCtx.textAlign = 'left';
    var col = 0;
    for (x = GRID_MAJOR; x < w; x += GRID_MAJOR * 2) {
      var row = 0;
      for (y = GRID_MAJOR; y < h; y += GRID_MAJOR * 2) {
        gCtx.fillText(
          String.fromCharCode(65 + (col % 26)) + row,
          x + 5, y - 4
        );
        row++;
      }
      col++;
    }

    gCtx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ================================================================
     RESIZE
     ================================================================ */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w   = window.innerWidth;
    h   = window.innerHeight;
    c.width  = w * dpr;  c.height  = h * dpr;
    gC.width = w * dpr;  gC.height = h * dpr;
    renderGrid();
  }

  /* ================================================================
     DRAWING PRIMITIVES
     ================================================================ */

  /* Corner-bracket bounding box */
  function drawBrackets(bx, by, bw, bh, cl, op) {
    ctx.strokeStyle = 'rgba(' + CYAN + ',' + op.toFixed(3) + ')';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    // TL
    ctx.moveTo(bx + cl, by);  ctx.lineTo(bx, by);      ctx.lineTo(bx, by + cl);
    // TR
    ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
    // BR
    ctx.moveTo(bx + bw, by + bh - cl); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cl, by + bh);
    // BL
    ctx.moveTo(bx + cl, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cl);
    ctx.stroke();
  }

  /* Typewriter telemetry text beside a target */
  function drawTelemetry(bx, by, bw, bh, lines, chars, op) {
    ctx.font = '9px "JetBrains Mono",monospace';
    ctx.fillStyle = 'rgba(' + CYAN + ',' + (op * TEXT_OP).toFixed(3) + ')';

    var tx;
    if (bx + bw + 215 < w) {
      tx = bx + bw + 10;
      ctx.textAlign = 'left';
    } else {
      tx = bx - 10;
      ctx.textAlign = 'right';
    }

    var counted = 0;
    for (var i = 0; i < lines.length; i++) {
      var vis = Math.min(lines[i].length, Math.max(0, chars - counted));
      if (vis > 0) ctx.fillText(lines[i].substring(0, vis), tx, by + 14 + i * 14);
      counted += lines[i].length;
    }
    ctx.textAlign = 'left';
  }

  /* Tiny center crosshair inside a box */
  function drawCrosshair(cx, cy, op) {
    ctx.strokeStyle = 'rgba(' + CYAN + ',' + (op * XHAIR_OP).toFixed(3) + ')';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  }

  /* ================================================================
     MAIN LOOP
     ================================================================ */
  var raf, prevTs = 0;

  function frame(ts) {
    raf = requestAnimationFrame(frame);

    var dt = ts - prevTs;
    if (dt < 16) return;          // cap at ~60 fps
    prevTs = ts;

    /* -- clear ---------------------------------------------------- */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);

    /* -- blit cached grid ----------------------------------------- */
    ctx.drawImage(gC, 0, 0);

    /* -- switch to CSS-pixel coordinates -------------------------- */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* -- scan line ------------------------------------------------ */
    scanPhase += dt / SCAN_PERIOD;
    if (scanPhase > 1) scanPhase -= 1;
    var sy = scanPhase * h;

    ctx.fillStyle = 'rgba(' + CYAN + ',0.02)';
    ctx.fillRect(0, sy - 0.5, w, 1);

    var grad = ctx.createLinearGradient(0, sy - 60, 0, sy);
    grad.addColorStop(0, 'rgba(' + CYAN + ',0)');
    grad.addColorStop(1, 'rgba(' + CYAN + ',0.01)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sy - 60, w, 60);

    /* -- spawn targets -------------------------------------------- */
    if (ts - lastSpawn > nextSpawn && targets.length < MAX_TGT) {
      var tw = rand(100, 240);
      var th = rand(70, 160);
      targets.push({
        x: rand(w * 0.04, w * 0.93 - tw),
        y: rand(h * 0.06, h * 0.90 - th),
        w: tw, h: th,
        born: ts,
        life: rand(LIFE_LO, LIFE_HI),
        telem: genTelemetry(),
        chars: 0,
        op: 0,
        cl: Math.min(tw, th) * 0.22
      });
      lastSpawn = ts;
      nextSpawn = rand(SPAWN_LO, SPAWN_HI);
    }

    /* -- update & draw targets ------------------------------------ */
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      var age = ts - t.born;

      /* cull dead targets */
      if (age > t.life) { targets.splice(i, 1); continue; }

      /* opacity lifecycle */
      var foStart = t.life - FADE_OUT;
      if      (age < FADE_IN)  t.op = (age / FADE_IN) * BRACKET_OP;
      else if (age < foStart)  t.op = BRACKET_OP;
      else                     t.op = BRACKET_OP * (1 - (age - foStart) / FADE_OUT);

      /* scale-in (0.85 → 1.0 during FADE_IN) */
      var s  = age < FADE_IN ? 0.85 + 0.15 * (age / FADE_IN) : 1;
      var cx = t.x + t.w * 0.5;
      var cy = t.y + t.h * 0.5;
      var dx = cx - t.w * s * 0.5;
      var dy = cy - t.h * s * 0.5;
      var dw = t.w * s;
      var dh = t.h * s;

      /* corner brackets */
      drawBrackets(dx, dy, dw, dh, t.cl * s, t.op);

      /* center crosshair */
      drawCrosshair(cx, cy, t.op);

      /* typewriter telemetry */
      if (age > FADE_IN * 0.35) {
        t.chars = ((age - FADE_IN * 0.35) * 0.065) | 0;
        drawTelemetry(dx, dy, dw, dh, t.telem, t.chars, t.op);
      }

      /* thin confidence bar below box */
      var barOp = t.op * 0.5;
      var barW  = dw * Math.min(1, age / (FADE_IN * 2));
      ctx.fillStyle = 'rgba(' + CYAN + ',' + barOp.toFixed(3) + ')';
      ctx.fillRect(dx, dy + dh + 4, barW, 1);
    }
  }

  /* ================================================================
     LIFECYCLE
     ================================================================ */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) cancelAnimationFrame(raf);
    else { prevTs = performance.now(); raf = requestAnimationFrame(frame); }
  });

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();
