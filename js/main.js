// ============================================
// AASIOM Website — Main JavaScript v5
// Hardened with Error Boundaries, SW & Memory Optimization
// ============================================

// ─── Supabase Configuration ──────────────────────────────────────────────
const SUPABASE_URL = "https://gmnhvfhrnjkptdhdhjey.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtbmh2ZmhybmprcHRkaGRoamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDQ0MzMsImV4cCI6MjA5Nzk4MDQzM30.Fn8nXUHdRNjmGzM8K3Nh-RCip8XRDeP1YI_iu-dA_-Y"; 

// The script tag we added in contact.html automatically creates the global 'supabase' object
const supabaseClient = (window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
(function () {
  'use strict';

  // ─── Core Utilities: Throttling & Debouncing ─────────────────────────────
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const throttleRAF = (func) => {
    let ticking = false;
    return (...args) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          func(...args);
          ticking = false;
        });
        ticking = true;
      }
    };
  };

  // ─── Error Boundary Utility ──────────────────────────────────────────────
  const safeInit = (name, fn) => {
    try {
      fn();
    } catch (err) {
      console.error(`[AASIOM] Module "${name}" failed to initialise:`, err);
    }
  };

  window.renderErrorBoundary = (containerSelector, retryCallback, message = "Component failed to load.") => {
    const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    if (!container) return;

    container.innerHTML = `
      <div class="error-boundary-ui" style="padding: 32px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; background: rgba(239, 68, 68, 0.05); backdrop-filter: blur(8px);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="margin-bottom: 16px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <h4 style="font-family: var(--font-head); font-size: 1.1rem; margin-bottom: 8px; color: #f87171;">System Error</h4>
        <p style="font-size: 0.9rem; color: var(--fg-2); margin-bottom: 20px;">${message}</p>
        <button class="btn btn-outline btn-retry" style="border-color: #ef4444; color: #ef4444;">Retry Connection</button>
      </div>
    `;

    const btn = container.querySelector('.btn-retry');
    if (btn && typeof retryCallback === 'function') {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.innerHTML = 'Retrying...';
        btn.style.opacity = '0.5';
        btn.disabled = true;
        retryCallback(container);
      });
    }
  };

  // ─── Network Resilience API ──────────────────────────────────────────────
  window.aasiomFetch = async (url, options = {}, retries = 3, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500 && retries > 0) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (retries > 0) {
        console.warn(`[AASIOM] fetch failed, retrying in 1s. Retries left: ${retries - 1}`);
        await new Promise(res => setTimeout(res, 1000));
        return window.aasiomFetch(url, options, retries - 1, timeoutMs);
      }
      throw error;
    }
  };

  // ─── Navbar: scroll glass effect ─────────────────────────────────────────
  const initNavbar = () => {
    const navbar = document.getElementById('navbar');
    if (!navbar || navbar.classList.contains('scrolled')) return;

    // Use rAF throttling to prevent scroll CPU thrashing
    const onNavScroll = throttleRAF(() => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
    window.addEventListener('scroll', onNavScroll, { passive: true });
    onNavScroll();
  };

  // ─── Mobile nav toggle ────────────────────────────────────────────────────
  const initMobileNav = () => {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (!navToggle || !navLinks) return;

    // Debounce toggle to prevent rapid state spams causing animation glitches
    const toggleNav = debounce(() => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
    }, 150);

    navToggle.addEventListener('click', toggleNav);

    // Event delegation for links to prevent multiple listener attachments
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        navToggle.innerHTML = '&#9776;';
      }
    });
  };

  // ─── Scroll-triggered fade-up animations ────────────────────────────────
  const initScrollAnimations = () => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const selectors = [
      '.domain-card', '.tech-feature-card', '.stat-item', '.tech-pill',
      '.tl-entry', '.contact-info-card', '.phase-card', '.mission-stat-box',
      '.founder-card', '.project-hero', '.section-header', '.ph-chip',
      '.ph-domain-badge', '.anvira-flip-card'
    ].join(', ');

    const elements = document.querySelectorAll(selectors);
    if (!elements.length) return;

    const sectionMap = new Map();
    elements.forEach(el => {
      const section = el.closest('section, .stats-bar') || document.body;
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section).push(el);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

    sectionMap.forEach((els) => {
      els.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s`;
        observer.observe(el);
      });
    });

    // Cleanup reference after initialization
    sectionMap.clear();
  };

  // ─── Counter animation ───────────────────────────────────────────────────
  const initCounters = () => {
    if (typeof IntersectionObserver === 'undefined') return;

    const counters = document.querySelectorAll('.stat-number');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const raw = el.textContent.trim();
        const match = raw.match(/^([<>]?)(\d+)([\+%skm\/7]*)$/);

        if (match) {
          const prefix = match[1];
          const target = parseInt(match[2]);
          const suffix = match[3] || '';
          const duration = 900;
          const start = performance.now();

          const tick = (now) => {
            try {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              el.textContent = prefix + Math.round(eased * target) + suffix;
              if (progress < 1) requestAnimationFrame(tick);
            } catch (e) {
              el.textContent = prefix + target + suffix;
            }
          };
          requestAnimationFrame(tick);
        }
        observer.unobserve(el);
      });
    }, { threshold: 0.4 });

    counters.forEach(el => observer.observe(el));
  };

  // ─── Hero mouse parallax ─────────────────────────────────────────────────
  const initHeroParallax = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const planetWrap = hero.querySelector('.planet-wrap');
    const heroCenter = hero.querySelector('.hero-center');
    if (!planetWrap && !heroCenter) return;

    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

    // rAF Throttle mousemove to avoid flooding GC with unhandled Event objects
    const handleMouseMove = throttleRAF((e) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    hero.addEventListener('mousemove', handleMouseMove, { passive: true });
    hero.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

    const lerp = (a, b, t) => a + (b - a) * t;

    const animate = () => {
      try {
        currentX = lerp(currentX, targetX, 0.04);
        currentY = lerp(currentY, targetY, 0.04);

        if (planetWrap) {
          planetWrap.style.transform = `translateX(calc(-50% + ${currentX * 12}px)) translateY(${currentY * 8}px)`;
        }
        if (heroCenter) {
          heroCenter.style.transform = `translate(${currentX * -4}px, ${currentY * -3}px)`;
        }
      } catch (e) {
        return;
      }
      requestAnimationFrame(animate);
    };
    animate();
  };

  // ─── Hero particle-network canvas ─────────────────────────────────────────
  const initHeroCanvas = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const testCanvas = document.createElement('canvas');
    if (!testCanvas.getContext || !testCanvas.getContext('2d')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'heroParticles';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.55;';
    hero.style.position = 'relative';
    hero.insertBefore(canvas, hero.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PARTICLE_COUNT = 55, MAX_DIST = 140;
    const CYAN = 'rgba(34,211,238,', GOLD = 'rgba(212,168,67,';
    let W, H, particles = [], raf;

    const resize = throttleRAF(() => {
      W = canvas.width = hero.offsetWidth;
      H = canvas.height = hero.offsetHeight;
    });
    resize();
    window.addEventListener('resize', resize, { passive: true });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.8, gold: Math.random() < 0.22,
      });
    }

    const draw = () => {
      try {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        });

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
            const dist = dx * dx + dy * dy; // optimization: avoid sqrt
            if (dist < MAX_DIST * MAX_DIST) {
              const alpha = (1 - Math.sqrt(dist) / MAX_DIST) * 0.35;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = ((particles[i].gold || particles[j].gold) ? GOLD : CYAN) + alpha + ')';
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
          }
        }

        particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = (p.gold ? GOLD : CYAN) + '0.7)';
          ctx.fill();
        });

        raf = requestAnimationFrame(draw);
      } catch (e) {
        cancelAnimationFrame(raf);
        canvas.remove();
      }
    };

    draw();

    if (typeof IntersectionObserver !== 'undefined') {
      const pauseObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!raf) draw();
          } else {
            cancelAnimationFrame(raf);
            raf = null;
          }
        });
      }, { threshold: 0 });
      pauseObserver.observe(hero);
    }
  };

 // ─── UTM & Marketing Attribution Extraction Helper ───────────────────────
  const getUTMAndTrafficData = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      source_page: window.location.pathname + window.location.hash,
      referrer: document.referrer || 'Direct',
      utm_source: urlParams.get('utm_source') || null,
      utm_medium: urlParams.get('utm_medium') || null,
      utm_campaign: urlParams.get('utm_campaign') || null
    };
  };

  // ─── Anonymous Analytical Event Logger ──────────────────────────────────
  const logAnalyticsEvent = async (eventName) => {
    try {
      if (!supabaseClient) return;
      const traffic = getUTMAndTrafficData();
      await supabaseClient.from('analytics_events').insert([{
        event_name: eventName,
        page_path: traffic.source_page,
        referrer: traffic.referrer,
        utm_source: traffic.utm_source,
        utm_medium: traffic.utm_medium,
        utm_campaign: traffic.utm_campaign
      }]);
    } catch (err) {
      console.warn(`[Analytics] Quietly caught log failure for ${eventName}:`, err);
    }
  };

  // ─── Contact Form & Advanced Lead-Capture Pipeline ───────────────────────
  const initContactForm = () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    // 1. Log anonymous page view instantly when visitor loads page
    logAnalyticsEvent('page_view');

    // 2. Track when a user actively interacts with the form elements
    form.addEventListener('focusin', () => {
      if (!form.dataset.started) {
        form.dataset.started = 'true';
        logAnalyticsEvent('form_started');
      }
    }, { once: true });

    const sendToSupabase = debounce(async (formData, btn, formContainer, originalCacheHTML, origText) => {
      try {
        if (!supabaseClient) throw new Error('Form service is not available.');
        const { error } = await supabaseClient
          .from('contact_submissions')
          .insert([formData]);

        if (error) throw error;

        logAnalyticsEvent('form_submitted');

        // Success State UI Transitions
        btn.innerHTML = 'Message Sent &#10003;';
        btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
        
        setTimeout(() => {
          btn.innerHTML = origText;
          btn.style.background = '';
          btn.style.opacity = '1';
          btn.disabled = false;
          form.reset();
          delete form.dataset.started;
        }, 3200);

      } catch (err) {
        logAnalyticsEvent('form_failed');
        console.error("[AASIOM] Lead generation pipeline failure:", err);
        
        window.renderErrorBoundary(formContainer, (container) => {
          container.innerHTML = originalCacheHTML;
          initContactForm(); // Re-initialize safely on form restoral
        }, `Submission Error: ${err.message || "Could not route lead parameters securely to core workspace table."}`);
      }
    }, 400);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;

      const formContainer = form.parentElement;
      const originalCacheHTML = formContainer.innerHTML;
      const origText = btn.innerHTML;

      btn.innerHTML = 'Sending...';
      btn.style.opacity = '0.7';
      btn.disabled = true;

      // Capture explicit input data points combined with traffic source variables
      const traffic = getUTMAndTrafficData();
      const formData = {
        full_name: document.getElementById('name')?.value || "",
        work_email: document.getElementById('email')?.value || "",
        organization: document.getElementById('org')?.value || "Not Provided", // Matches NOT NULL
        job_title: document.getElementById('role')?.value || "Not Provided",    // Matches NOT NULL
        reason_for_contact: document.getElementById('type')?.value || "General Inquiry",
        message: document.getElementById('message')?.value || "",
        phone_number: document.getElementById('phone')?.value || null,
        linkedin_profile: document.getElementById('linkedin')?.value || null,
        company_website: document.getElementById('website')?.value || null,
        ...traffic
      };

      sendToSupabase(formData, btn, formContainer, originalCacheHTML, origText);
    });

    // ─── Setup Click Tracking Listeners for Anonymous Events ─────────────────
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      el.addEventListener('click', () => logAnalyticsEvent('whatsapp_clicked'));
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
      el.addEventListener('click', () => logAnalyticsEvent('email_clicked'));
    });
    document.querySelectorAll('a[download], .download-btn').forEach(el => {
      el.addEventListener('click', () => logAnalyticsEvent('document_download_clicked'));
    });
    document.querySelectorAll('.book-demo-btn, a[href="#contactForm"]').forEach(el => {
      el.addEventListener('click', () => logAnalyticsEvent('book_demo_clicked'));
    });
  };
  // ─── Section labels: subtle reveal ───────────────────────────────────────
  const initLabelReveal = () => {
    if (typeof IntersectionObserver === 'undefined') return;
    const labels = document.querySelectorAll('.section-label');
    if (!labels.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.letterSpacing = '0.2em';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    labels.forEach(el => {
      el.style.opacity = '0';
      el.style.letterSpacing = '0.05em';
      el.style.transition = 'opacity 0.6s ease, letter-spacing 0.6s ease';
      observer.observe(el);
    });
  };

  // ─── Service Worker Registration ─────────────────────────────────────────
  const initServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.warn('[AASIOM] Service Worker registration failed:', err);
        });
      });
    }
  };

  // ─── Global Error Fallbacks ──────────────────────────────────────────────
  window.addEventListener('error', (event) => {
    console.error('[AASIOM] Unhandled error isolated:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[AASIOM] Unhandled promise rejection isolated:', event.reason);
    event.preventDefault();
  });

  // ─── Approach Section Timeline Animations ────────────────────────────────
  const initApproachTimeline = () => {
    if (typeof IntersectionObserver === 'undefined') return;

    const items = document.querySelectorAll('.approach-timeline-item');
    if (!items.length) return;

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          setTimeout(() => {
            entry.target.style.transition = '';
          }, 1200);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          items.forEach(el => el.classList.remove('active'));
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.5, rootMargin: '-15% 0px -15% 0px' });

    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.12}s`;
      revealObserver.observe(el);
      activeObserver.observe(el);
    });
  };

  // ─── Research Section Animations ─────────────────────────────────────────
  const initResearchAnimations = () => {
    if (typeof IntersectionObserver === 'undefined') return;

    const cards = document.querySelectorAll('.research-block-card');
    if (!cards.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          setTimeout(() => {
            entry.target.style.transition = '';
          }, 1000);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    cards.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s`;
      observer.observe(el);
    });
  };

  // ─── Initialise ──────────────────────────────────────────────────────────
  const init = () => {
    safeInit('Navbar', initNavbar);
    safeInit('MobileNav', initMobileNav);
    safeInit('ScrollAnimations', initScrollAnimations);
    safeInit('Counters', initCounters);
    safeInit('HeroCanvas', initHeroCanvas);
    safeInit('HeroParallax', initHeroParallax);
    safeInit('ContactForm', initContactForm);
    safeInit('SmoothScroll', initSmoothScroll);
    safeInit('LabelReveal', initLabelReveal);
    safeInit('ServiceWorker', initServiceWorker);
    safeInit('ApproachTimeline', initApproachTimeline);
    safeInit('ResearchAnimations', initResearchAnimations);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
