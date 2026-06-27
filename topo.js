(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  body.classList.add('aasiom-future-ready');

  function ensureStage() {
    if (!document.querySelector('.aasiom-stage')) {
      var stage = document.createElement('div');
      stage.className = 'aasiom-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML = '<span></span><span></span><span></span>';
      document.body.prepend(stage);
    }
  }

  function setupHeader() {
    var nav = document.querySelector('.nav, #nav, #navbar');
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    function onScroll() {
      var scrolled = window.scrollY > 10;
      body.classList.toggle('aasiom-scrolled', scrolled);
      if (nav) nav.classList.toggle('scrolled', scrolled);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (nav && navToggle && navLinks) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        navLinks.classList.toggle('active', open);
        navToggle.setAttribute('aria-expanded', String(open));
      });
      navLinks.addEventListener('click', function (event) {
        if (event.target && event.target.tagName === 'A') {
          nav.classList.remove('open');
          navLinks.classList.remove('active');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  function setupReveal() {
    var selectors = [
      '.reveal',
      'section',
      '.hero-grid > *',
      '.contact-hero-grid > *',
      '.page-header .container > *',
      '.card',
      '.stat',
      '.trust-item',
      '.tech-feature-card',
      '.engage-card',
      '.think-card',
      '.mission-stat-box',
      '.anvira-flip-card',
      '.domain-card',
      '.contact-direct-card',
      '.contact-form-panel',
      '.ph-chip',
      '.metric-panel',
      '.anvira-panel',
      '.closing-box'
    ];
    var targets = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));
    targets.forEach(function (el, index) {
      el.classList.remove('premium-reveal', 'a3d-reveal');
      el.classList.add('future-reveal');
      el.style.setProperty('--future-delay', Math.min(index % 10, 7) * 42 + 'ms');
    });

    if ('IntersectionObserver' in window && !reduceMotion) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -9% 0px' });
      targets.forEach(function (el) { observer.observe(el); });
    } else {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  function setupTilt() {
    if (reduceMotion) return;
    var targets = Array.prototype.slice.call(document.querySelectorAll('.card, .tech-feature-card, .engage-card, .think-card, .trust-item, .contact-direct-card, .contact-form-panel, .metric-panel, .ph-chip, .stat'));
    targets.forEach(function (el) {
      el.addEventListener('pointermove', function (event) {
        var rect = el.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width) - 0.5;
        var y = ((event.clientY - rect.top) / rect.height) - 0.5;
        el.style.setProperty('--ry', (x * -7).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (y * 5).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.removeProperty('--ry');
        el.style.removeProperty('--rx');
      });
    });
  }

  function setupPointerLight() {
    if (reduceMotion) return;
    var root = document.documentElement;
    window.addEventListener('pointermove', function (event) {
      root.style.setProperty('--mx', (event.clientX / window.innerWidth * 100).toFixed(2) + '%');
      root.style.setProperty('--my', (event.clientY / window.innerHeight * 100).toFixed(2) + '%');
    }, { passive: true });
  }

  function setupCanvas() {
    if (reduceMotion) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'aasiom-ambient-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    var ctx = canvas.getContext('2d', { alpha: true });
    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var width = 0;
    var height = 0;
    var particles = [];
    var lines = [];
    var mouse = { x: 0.5, y: 0.25 };

    function particleCount() {
      if (window.innerWidth < 640) return 34;
      if (window.innerWidth < 980) return 52;
      return 78;
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = particleCount();
      particles = Array.from({ length: count }, function (_, i) {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 0.7 + 0.3,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.7 + 0.7,
          hue: i % 5 === 0 ? '244,184,74' : (i % 3 === 0 ? '25,214,189' : '36,215,255')
        };
      });
      lines = Array.from({ length: Math.max(9, Math.floor(count / 5)) }, function () {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * 180 + 120,
          speed: Math.random() * 0.7 + 0.35,
          angle: -0.35 + Math.random() * 0.16
        };
      });
    }

    function drawGrid(time) {
      var gap = width < 640 ? 46 : 58;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = 'rgba(125,220,255,0.34)';
      ctx.lineWidth = 1;
      var offset = (time * 0.018) % gap;
      for (var x = -gap + offset; x < width + gap; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + width * 0.10, height);
        ctx.stroke();
      }
      for (var y = -gap + offset; y < height + gap; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y - height * 0.06);
        ctx.stroke();
      }
      ctx.restore();
    }

    function render(time) {
      ctx.clearRect(0, 0, width, height);
      drawGrid(time);

      var mx = mouse.x * width;
      var my = mouse.y * height;
      var gradient = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(width, height) * 0.55);
      gradient.addColorStop(0, 'rgba(36,215,255,0.12)');
      gradient.addColorStop(0.42, 'rgba(25,214,189,0.045)');
      gradient.addColorStop(1, 'rgba(36,215,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      lines.forEach(function (line) {
        line.x += Math.cos(line.angle) * line.speed;
        line.y += Math.sin(line.angle) * line.speed;
        if (line.x > width + line.length) line.x = -line.length;
        if (line.y < -80) line.y = height + 80;
        ctx.save();
        ctx.translate(line.x, line.y);
        ctx.rotate(line.angle);
        var lg = ctx.createLinearGradient(0, 0, line.length, 0);
        lg.addColorStop(0, 'rgba(36,215,255,0)');
        lg.addColorStop(0.45, 'rgba(36,215,255,0.32)');
        lg.addColorStop(1, 'rgba(244,184,74,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(line.length, 0);
        ctx.stroke();
        ctx.restore();
      });

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + p.hue + ',' + (0.35 + p.z * 0.45) + ')';
        ctx.shadowColor = 'rgba(' + p.hue + ',0.55)';
        ctx.shadowBlur = 12;
        ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var max = width < 640 ? 88 : 118;
          if (dist < max) {
            ctx.strokeStyle = 'rgba(125,220,255,' + ((1 - dist / max) * 0.18) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', function (event) {
      mouse.x = event.clientX / window.innerWidth;
      mouse.y = event.clientY / window.innerHeight;
    }, { passive: true });
    resize();
    requestAnimationFrame(render);
  }

  ensureStage();
  setupHeader();
  setupReveal();
  setupTilt();
  setupPointerLight();
  setupCanvas();
})();
