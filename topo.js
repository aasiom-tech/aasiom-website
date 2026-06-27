(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  body.classList.add('aasiom-future-ready');

  function ensureStage() {
    if (document.querySelector('.aasiom-stage')) return;
    var stage = document.createElement('div');
    stage.className = 'aasiom-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<span></span><span></span><span></span>';
    body.prepend(stage);
  }

  function setupScenes() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('section, .section, .home-frame, .contact-section, .credibility, .closing'));
    sections.forEach(function (section, index) {
      if (section.closest('.nav, footer, .footer')) return;
      section.classList.add('aasiom-scene');
      section.style.setProperty('--future-delay', Math.min(index, 8) * 55 + 'ms');
    });
  }

  function setupHeader() {
    var nav = document.querySelector('.nav, #nav, #navbar');
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    function onScroll() {
      var scrolled = window.scrollY > 8;
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
        navLinks.classList.toggle('show', open);
        navToggle.setAttribute('aria-expanded', String(open));
      });
      navLinks.addEventListener('click', function (event) {
        if (event.target && event.target.tagName === 'A') {
          nav.classList.remove('open');
          navLinks.classList.remove('active');
          navLinks.classList.remove('show');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  function setupReveal() {
    var selectors = [
      '.aasiom-scene > .container',
      '.hero .container',
      '.page-header .container',
      '.contact-hero .container',
      '.card',
      '.stat',
      '.trust-item',
      '.trust-card',
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
      '.closing-box',
      '.command-card',
      '.map-panel',
      '.pipeline-wrap',
      '.dashboard-preview',
      '.cta-panel'
    ];
    var targets = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));
    targets.forEach(function (el, index) {
      el.classList.remove('premium-reveal', 'a3d-reveal');
      el.classList.add('future-reveal');
      el.style.setProperty('--future-delay', Math.min(index % 9, 8) * 45 + 'ms');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  function setupPointerDepth() {
    if (reduceMotion) return;
    var root = document.documentElement;
    var raf = 0;

    window.addEventListener('pointermove', function (event) {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        root.style.setProperty('--mx', (event.clientX / Math.max(window.innerWidth, 1) * 100).toFixed(2) + '%');
        root.style.setProperty('--my', (event.clientY / Math.max(window.innerHeight, 1) * 100).toFixed(2) + '%');
      });
    }, { passive: true });

    var cards = Array.prototype.slice.call(document.querySelectorAll('.card, .tech-feature-card, .engage-card, .think-card, .trust-item, .trust-card, .contact-direct-card, .contact-form-panel, .metric-panel, .ph-chip, .stat, .command-card, .map-panel, .pipeline-wrap, .dashboard-preview, .cta-panel'));
    cards.forEach(function (el) {
      el.addEventListener('pointermove', function (event) {
        if (window.innerWidth < 900) return;
        var rect = el.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width) - 0.5;
        var y = ((event.clientY - rect.top) / rect.height) - 0.5;
        el.style.setProperty('--ry', (x * -5).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (y * 4).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
      });
    });
  }

  function setupCanvas() {
    if (reduceMotion || document.querySelector('.aasiom-ambient-canvas')) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'aasiom-ambient-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    body.prepend(canvas);

    var ctx = canvas.getContext('2d', { alpha: true });
    var width = 0;
    var height = 0;
    var dpr = 1;
    var particles = [];
    var lanes = [];
    var mobile = false;

    function count() {
      if (window.innerWidth < 640) return 28;
      if (window.innerWidth < 1024) return 42;
      return 58;
    }

    function reset() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.45);
      width = window.innerWidth;
      height = window.innerHeight;
      mobile = width < 640;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = Array.from({ length: count() }, function (_, i) {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z: .35 + Math.random() * .9,
          vx: (-.16 + Math.random() * .32),
          vy: (-.11 + Math.random() * .22),
          r: 1 + Math.random() * 1.8,
          hue: i % 5 === 0 ? '244,173,85' : (i % 3 === 0 ? '53,225,194' : '90,221,255')
        };
      });

      lanes = Array.from({ length: mobile ? 5 : 9 }, function () {
        return {
          y: Math.random() * height,
          x: Math.random() * width,
          speed: .35 + Math.random() * .75,
          length: 90 + Math.random() * 190
        };
      });
    }

    function drawGrid(time) {
      var gap = mobile ? 58 : 72;
      var offset = (time * .018) % gap;
      ctx.save();
      ctx.globalAlpha = .25;
      ctx.strokeStyle = 'rgba(126,221,255,.11)';
      ctx.lineWidth = 1;
      for (var x = -gap + offset; x < width + gap; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + width * .08, height);
        ctx.stroke();
      }
      for (var y = -gap + offset; y < height + gap; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y - height * .05);
        ctx.stroke();
      }
      ctx.restore();
    }

    function render(time) {
      ctx.clearRect(0, 0, width, height);
      drawGrid(time);

      lanes.forEach(function (lane) {
        lane.x += lane.speed;
        if (lane.x - lane.length > width) {
          lane.x = -lane.length;
          lane.y = Math.random() * height;
        }
        var gradient = ctx.createLinearGradient(lane.x - lane.length, lane.y, lane.x, lane.y);
        gradient.addColorStop(0, 'rgba(90,221,255,0)');
        gradient.addColorStop(.52, 'rgba(90,221,255,.28)');
        gradient.addColorStop(1, 'rgba(53,225,194,0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(lane.x - lane.length, lane.y);
        ctx.lineTo(lane.x, lane.y);
        ctx.stroke();
      });

      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + p.hue + ',' + (.24 + p.z * .26) + ')';
        ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        ctx.fill();

        for (var j = i + 1; j < particles.length; j += 1) {
          var q = particles[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var max = mobile ? 90 : 125;
          if (dist < max) {
            ctx.strokeStyle = 'rgba(126,221,255,' + ((1 - dist / max) * .15) + ')';
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    }

    window.addEventListener('resize', reset, { passive: true });
    reset();
    requestAnimationFrame(render);
  }

  ensureStage();
  setupScenes();
  setupHeader();
  setupReveal();
  setupPointerDepth();
  setupCanvas();
})();
