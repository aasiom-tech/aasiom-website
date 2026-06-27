(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.menu-toggle');
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d', { alpha: true });
  var particles = [];
  var streams = [];
  var sceneMedia = Array.prototype.slice.call(document.querySelectorAll('.scene-media'));
  var width = 0;
  var height = 0;
  var dpr = 1;

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  window.addEventListener('pointermove', function (event) {
    if (reduceMotion) return;
    document.documentElement.style.setProperty('--mx', (event.clientX / window.innerWidth * 100).toFixed(1) + '%');
    document.documentElement.style.setProperty('--my', (event.clientY / window.innerHeight * 100).toFixed(1) + '%');
  }, { passive: true });

  function updateParallax() {
    if (reduceMotion || width < 760) return;
    sceneMedia.forEach(function (el) {
      var rect = el.parentElement.getBoundingClientRect();
      var progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - height / 2) / height));
      el.style.setProperty('--scroll-y', (progress * -18).toFixed(1) + 'px');
    });
  }

  window.addEventListener('scroll', updateParallax, { passive: true });

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal, .scene h1, .scene h2, .scene p, .card, .panel, .hud, .step'));
  reveals.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window && !reduceMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .14 });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  if (reduceMotion) return;

  canvas.className = 'ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  function reset() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.4);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = width < 700 ? 30 : 58;
    particles = Array.from({ length: count }, function (_, i) {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .22,
        vy: (Math.random() - .5) * .16,
        r: .9 + Math.random() * 1.8,
        c: i % 5 === 0 ? '242,176,78' : '83,215,255'
      };
    });

    streams = Array.from({ length: width < 700 ? 5 : 10 }, function () {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        speed: .5 + Math.random() * .9,
        len: 120 + Math.random() * 260
      };
    });
    updateParallax();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    streams.forEach(function (s) {
      s.x += s.speed;
      if (s.x - s.len > width) {
        s.x = -s.len;
        s.y = Math.random() * height;
      }
      var g = ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
      g.addColorStop(0, 'rgba(83,215,255,0)');
      g.addColorStop(.5, 'rgba(83,215,255,.26)');
      g.addColorStop(1, 'rgba(83,215,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - s.len, s.y);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    });

    particles.forEach(function (p, i) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
      ctx.fillStyle = 'rgba(' + p.c + ',.52)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      for (var j = i + 1; j < particles.length; j += 1) {
        var q = particles[j];
        var dx = p.x - q.x;
        var dy = p.y - q.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.strokeStyle = 'rgba(83,215,255,' + ((1 - d / 120) * .14) + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', reset, { passive: true });
  reset();
  draw();
})();
