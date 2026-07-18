/**
 * AASIOM — Topographic Contour Canvas
 * Draws slowly morphing GIS-style contour lines using marching squares.
 * Designed for low CPU/GPU overhead (~12 fps cap, pauses when tab hidden).
 */
(function () {
  'use strict';

  var overlay = document.querySelector('.noise-overlay');
  if (!overlay) return;

  /* ---- canvas setup ---- */
  var c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:1;';
  overlay.parentNode.insertBefore(c, overlay.nextSibling);

  var ctx = c.getContext('2d');
  var w, h, cols, rows, t = 0;
  var CELL = 28;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    c.width  = w;
    c.height = h;
    cols = Math.ceil(w / CELL) + 2;
    rows = Math.ceil(h / CELL) + 2;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---- Perlin noise (seeded permutation table) ---- */
  var P = new Uint8Array(512);
  var perm = [];
  for (var i = 0; i < 256; i++) perm[i] = i;
  for (var i = 255; i > 0; i--) {
    var j = (Math.abs((Math.sin(i * 127.1 + 311.7) * 43758.5453) | 0)) % (i + 1);
    var tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
  }
  for (var i = 0; i < 512; i++) P[i] = perm[i & 255];

  var G = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  function noise(x, y) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = fade(xf), v = fade(yf);
    var g00 = G[P[P[X] + Y] & 7],     g10 = G[P[P[X + 1] + Y] & 7];
    var g01 = G[P[P[X] + Y + 1] & 7], g11 = G[P[P[X + 1] + Y + 1] & 7];
    var n00 = g00[0] * xf       + g00[1] * yf;
    var n10 = g10[0] * (xf - 1) + g10[1] * yf;
    var n01 = g01[0] * xf       + g01[1] * (yf - 1);
    var n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);
    var nx0 = n00 + u * (n10 - n00);
    var nx1 = n01 + u * (n11 - n01);
    return nx0 + v * (nx1 - nx0);
  }

  function fbm(x, y) {
    return noise(x, y) * 0.6
         + noise(x * 2.1 + 5.3, y * 2.1 + 1.7) * 0.3
         + noise(x * 4.2 + 8.1, y * 4.2 + 3.2) * 0.1;
  }

  /* ---- marching squares ---- */
  function interp(a, b, th) {
    var d = b - a;
    return Math.abs(d) < 1e-8 ? 0.5 : (th - a) / d;
  }

  function contour(field, th) {
    ctx.beginPath();
    for (var r = 0; r < rows - 1; r++) {
      for (var cl = 0; cl < cols - 1; cl++) {
        var v0 = field[r][cl],     v1 = field[r][cl + 1];
        var v2 = field[r + 1][cl + 1], v3 = field[r + 1][cl];
        var idx = (v0 > th ? 8 : 0) | (v1 > th ? 4 : 0)
                | (v2 > th ? 2 : 0) | (v3 > th ? 1 : 0);
        if (!idx || idx === 15) continue;

        var x = cl * CELL, y = r * CELL;
        var tx = x + interp(v0, v1, th) * CELL;          /* top edge    */
        var ry = y + interp(v1, v2, th) * CELL;          /* right edge  */
        var bx = x + interp(v3, v2, th) * CELL;          /* bottom edge */
        var ly = y + interp(v0, v3, th) * CELL;          /* left edge   */

        switch (idx) {
          case 1:  case 14: ctx.moveTo(x, ly);      ctx.lineTo(bx, y + CELL); break;
          case 2:  case 13: ctx.moveTo(bx, y + CELL); ctx.lineTo(x + CELL, ry); break;
          case 3:  case 12: ctx.moveTo(x, ly);      ctx.lineTo(x + CELL, ry); break;
          case 4:  case 11: ctx.moveTo(tx, y);      ctx.lineTo(x + CELL, ry); break;
          case 6:  case 9:  ctx.moveTo(tx, y);      ctx.lineTo(bx, y + CELL); break;
          case 7:  case 8:  ctx.moveTo(x, ly);      ctx.lineTo(tx, y);        break;
          case 5:  /* saddle */
            ctx.moveTo(x, ly); ctx.lineTo(tx, y);
            ctx.moveTo(bx, y + CELL); ctx.lineTo(x + CELL, ry); break;
          case 10: /* saddle */
            ctx.moveTo(tx, y); ctx.lineTo(x + CELL, ry);
            ctx.moveTo(x, ly); ctx.lineTo(bx, y + CELL); break;
        }
      }
    }
    ctx.stroke();
  }

  /* ---- render loop (capped at ~12 fps) ---- */
  var last = 0, raf;

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (ts - last < 83) return;
    last = ts;
    t += 0.0015;

    ctx.clearRect(0, 0, w, h);

    /* build scalar field */
    var field = [];
    for (var r = 0; r < rows; r++) {
      field[r] = [];
      for (var cl = 0; cl < cols; cl++) {
        field[r][cl] = fbm(cl * 0.065 + t * 0.4, r * 0.065 + t * 0.25);
      }
    }

    /* minor contours — thin, faint */
    ctx.strokeStyle = 'rgba(34,211,238,0.07)';
    ctx.lineWidth = 0.5;
    for (var th = -0.5; th <= 0.5; th += 0.055) contour(field, th);

    /* major contours — slightly brighter */
    ctx.strokeStyle = 'rgba(34,211,238,0.15)';
    ctx.lineWidth = 0.8;
    for (var th = -0.45; th <= 0.5; th += 0.275) contour(field, th);
  }

  /* pause when tab is hidden to save battery */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { last = 0; raf = requestAnimationFrame(frame); }
  });

  requestAnimationFrame(frame);
})();
