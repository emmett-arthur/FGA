/* ============================================================
   FGA — site behaviours (vanilla JS, no dependencies)
   1. Tidal canvas — streamline trail animation behind the hero
   2. Theme-aware nav — inverts over light sections
   3. Scrolled lockup — reveals the FGA wordmark past the hero
   4. Mobile menu toggle
   ============================================================ */
(function () {
  'use strict';

  var NAVY = '#0E1B35';
  var SKY  = '#6EA3D4';

  /* ── 1. Tidal canvas ──────────────────────────────────────
     700 particles drift along a sinusoidal flow field, drawing
     ultra-slow-fade line trails (0.008 alpha/frame) that build
     into long wispy streamlines. Ported from TidalCanvas (2).jsx.
     Speed scales with viewport so mobile feels as calm as desktop. */
  function initTidalCanvas() {
    var c = document.getElementById('tidalCanvas');
    if (!c) return;

    var W = c.offsetWidth  || window.innerWidth;
    var H = c.offsetHeight || window.innerHeight;
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    var N = 700, MAX_AGE = 580;

    // 0.55 at 375px phone → 1.0 at 1280px+ desktop
    function calcMove() { return 0.55 + 0.45 * Math.min(1, Math.max(0, (W - 375) / 905)); }
    var MOVE = calcMove();

    var particles = [];
    for (var i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        age: Math.floor(Math.random() * MAX_AGE)
      });
    }

    function flow(x, y, t) {
      var nx = x / W, ny = y / H;
      var vx = ((Math.sin(ny*Math.PI*2.2+t*0.3)*Math.cos(nx*Math.PI*1.4+t*0.16))*1.5
              +  (Math.cos(ny*Math.PI*1.1+t*0.19)*0.38))*1.5;
      var vy = ((Math.cos(nx*Math.PI*2.4+t*0.25)*Math.sin(ny*Math.PI*1.3+t*0.18))*1.1
              +  (Math.sin(nx*Math.PI*1.0+t*0.17)*0.3))*1.5;
      return { vx: vx, vy: vy };
    }

    var t = 0, running = true;

    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);

    function tick() {
      if (!running) return;
      ctx.fillStyle = 'rgba(14,27,53,0.008)';
      ctx.fillRect(0, 0, W, H);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var ox = p.x, oy = p.y;
        var v = flow(p.x, p.y, t);
        p.x += v.vx * MOVE;
        p.y += v.vy * MOVE;
        p.age++;

        if (p.x < -4 || p.x > W+4 || p.y < -4 || p.y > H+4 || p.age > MAX_AGE) {
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.age = 0;
          continue;
        }

        var life = Math.min(1, p.age/40) * (1 - Math.max(0, (p.age - MAX_AGE*0.72) / (MAX_AGE*0.28)));
        ctx.globalAlpha = life * 0.18;
        ctx.strokeStyle = SKY;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      t += 0.006;
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Re-seed on resize (debounced)
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        W = c.width  = c.offsetWidth  || window.innerWidth;
        H = c.height = c.offsetHeight || window.innerHeight;
        MOVE = calcMove();
        ctx.fillStyle = NAVY;
        ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
          particles[i].x = Math.random() * W;
          particles[i].y = Math.random() * H;
          particles[i].age = 0;
        }
      }, 200);
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
