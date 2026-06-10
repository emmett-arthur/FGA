/* ============================================================
   FGA — site behaviours (vanilla JS, no dependencies)
   1. Tidal canvas — sparse particle flow field behind the hero
   2. Theme-aware nav — inverts over light sections
   3. Scrolled lockup — reveals the FGA wordmark past the hero
   4. Mobile menu toggle
   ============================================================ */
(function () {
  'use strict';

  var NAVY = '#0E1B35';
  var SKY  = '#6EA3D4';

  /* ── 1. Tidal canvas ──────────────────────────────────────
     Particles drift along two overlapping sinusoidal flow
     fields, fading in then out — settles into clean streamlines.
     Tuneable knobs are labelled below. */
  function initTidalCanvas() {
    var c = document.getElementById('tidalCanvas');
    if (!c) return;

    var W, H, ctx, pts, t = 0, running = true;
    var N   = 380;   // particle count — higher = denser
    var MAX = 180;   // particle lifetime in frames — longer = longer trails
    var FADE = 0.032;// trail decay per frame — higher = shorter trails
    var SPEED = 0.006;// animation speed

    function seed() {
      W = c.width = window.innerWidth;
      H = c.height = window.innerHeight;
      ctx = c.getContext('2d');
      pts = [];
      for (var i = 0; i < N; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          age: Math.floor(Math.random() * MAX)
        });
      }
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, W, H);
    }

    function vf(x, y, tt) {
      return {
        vx: (Math.sin(y / H * Math.PI * 2.2 + tt * 0.30) * Math.cos(x / W * Math.PI * 1.4 + tt * 0.16)) * 1.3
            + Math.cos(y / H * Math.PI * 1.1 + tt * 0.19) * 0.30,
        vy: (Math.cos(x / W * Math.PI * 2.4 + tt * 0.25) * Math.sin(y / H * Math.PI * 1.3 + tt * 0.18)) * 0.95
            + Math.sin(x / W * Math.PI * 1.0 + tt * 0.17) * 0.25
      };
    }

    function tick() {
      if (!running) return;
      ctx.fillStyle = 'rgba(14,27,53,' + FADE + ')';
      ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var v = vf(p.x, p.y, t);
        var ox = p.x, oy = p.y;
        p.x += v.vx; p.y += v.vy; p.age++;
        if (p.age > MAX || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
          p.x = Math.random() * W; p.y = Math.random() * H; p.age = 0;
          continue;
        }
        var life = Math.min(1, p.age / 40) * (1 - Math.max(0, (p.age - MAX * 0.65) / (MAX * 0.35)));
        ctx.globalAlpha = life * 0.22;
        ctx.strokeStyle = SKY;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      t += SPEED;
      requestAnimationFrame(tick);
    }

    seed();
    requestAnimationFrame(tick);

    // Re-seed on resize (debounced)
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(seed, 200);
    });

    // Pause when the tab is hidden to save battery
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    });
  }

  /* ── 2 + 3. Nav: scrolled lockup + theme inversion ──────── */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    // Reveal the FGA wordmark lockup once past the hero
    var heroEnd = document.getElementById('hero-end');
    if (heroEnd && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        nav.classList.toggle('nav-scrolled', !entries[0].isIntersecting);
      }, { threshold: 0, rootMargin: '-72px 0px 0px 0px' });
      obs.observe(heroEnd);
    } else {
      nav.classList.add('nav-scrolled');
    }

    // Invert nav colours when the section under it is light
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-theme]'));
    var raf = null;
    function check() {
      var probe = 40, light = false;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          light = sections[i].getAttribute('data-theme') === 'light';
          break;
        }
      }
      nav.classList.toggle('nav-light', light);
      raf = null;
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(check); }
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
  }

  /* ── 4. Mobile menu ──────────────────────────────────────── */
  function initMobileMenu() {
    var btn = document.getElementById('hamburger');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    function setOpen(open) {
      btn.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () {
      setOpen(!menu.classList.contains('open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
  }

  function init() {
    initTidalCanvas();
    initNav();
    initMobileMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
