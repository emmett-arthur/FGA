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
     Rankine-vortex flow field with pseudo-noise. Teardrop
     particles sized and alpha'd by local flow speed.
     Ported from TidalCanvas.jsx (React component). */
  function initTidalCanvas() {
    var c = document.getElementById('tidalCanvas');
    if (!c) return;

    var W = window.innerWidth, H = window.innerHeight;
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    var N       = 960;   // particle count
    var MAX_AGE = 480;   // frames before forced respawn
    var MOVE    = 0.11;  // velocity scale (~2-3 px/frame at peak)

    var particles = [];
    for (var i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        age: Math.floor(Math.random() * MAX_AGE)
      });
    }

    // Rankine sub-vortex: solid-body rotation inside coreR, 1/r outside
    function rankine(nx, ny, cx, cy, strength, coreR) {
      var dx = nx - cx, dy = ny - cy;
      var r = Math.sqrt(dx*dx + dy*dy) + 0.001;
      var vt = strength * (r < coreR ? r/coreR : coreR/r);
      return { vx: vt*(-dy)/r, vy: vt*(dx)/r };
    }

    // Pseudo-noise for organic irregularity
    function pnoise(nx, ny, t) {
      return (
        Math.sin(nx*6.3  + t*0.18) * Math.cos(ny*4.7  + t*0.13) * 0.0016 +
        Math.sin(nx*11.1 - t*0.11) * Math.cos(ny*8.9  + t*0.09) * 0.0008
      );
    }

    // Multi-vortex flow field (A–G) + background shear + noise
    function flow(nx, ny, t) {
      var vx = 0, vy = 0;
      var v;

      // A — upper-left: large clockwise gyre
      v = rankine(nx, ny,
        0.09 + 0.016*Math.sin(t*0.06), 0.16 + 0.009*Math.cos(t*0.08),
        0.013, 0.20);
      vx += v.vx; vy += v.vy;

      // B — lower-left: medium CCW, two stacked for elliptical shape
      v = rankine(nx, ny, 0.17, 0.64, -0.009, 0.13);
      vx += v.vx; vy += v.vy;
      v = rankine(nx, ny, 0.24, 0.76, -0.005, 0.08);
      vx += v.vx; vy += v.vy;

      // C — upper-right: smaller tight gyre, inflection not closed orbit
      v = rankine(nx, ny,
        0.82 + 0.010*Math.sin(t*0.05 + 1.1), 0.30 + 0.007*Math.cos(t*0.07),
        0.010, 0.11);
      vx += v.vx; vy += v.vy;

      // Upper-right jet — open through-flow curling around C
      var urx = Math.max(0, nx - 0.52), ury = Math.max(0, 0.48 - ny);
      var urStr = urx * ury * 0.10;
      vx += urStr * (-0.55 - 0.15*Math.sin(t*0.07));
      vy += urStr * ( 0.45 + 0.10*Math.cos(t*0.06));

      // D — lower-right: small CCW trailing eddy
      v = rankine(nx, ny, 0.87, 0.80, -0.005, 0.08);
      vx += v.vx; vy += v.vy;

      // E — centre-top edge: small CCW
      v = rankine(nx, ny, 0.46 + 0.012*Math.sin(t*0.09), 0.06, -0.007, 0.09);
      vx += v.vx; vy += v.vy;

      // F — right-middle: small CW between C and D
      v = rankine(nx, ny, 0.73, 0.58 + 0.010*Math.cos(t*0.08+0.8), 0.006, 0.09);
      vx += v.vx; vy += v.vy;

      // G — bottom-centre: small CCW hugging bottom edge
      v = rankine(nx, ny, 0.52, 0.94, -0.006, 0.08);
      vx += v.vx; vy += v.vy;

      // Background shear — slow mean flow connecting all features
      vx += 0.004 * Math.sin(ny * Math.PI * 1.4 + t * 0.04);
      vy += 0.002 * Math.cos(nx * Math.PI * 1.1 + t * 0.035);

      // Pseudo-noise — breaks remaining regularity
      vx += pnoise(nx, ny, t);
      vy += pnoise(ny, nx, t + 1.57);

      return { vx: vx, vy: vy };
    }

    function drawTeardrop(x, y, angle, tailLen, headR, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = SKY;
      ctx.beginPath();
      ctx.moveTo(-tailLen, 0);
      ctx.quadraticCurveTo(-tailLen * 0.3, -headR, 0, -headR);
      ctx.arc(0, 0, headR, -Math.PI * 0.5, Math.PI * 0.5, false);
      ctx.quadraticCurveTo(-tailLen * 0.3, headR, -tailLen, 0);
      ctx.fill();
      ctx.restore();
    }

    var t = 0, running = true;

    function tick() {
      if (!running) return;
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, W, H);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var nx = p.x / W, ny = p.y / H;
        var v = flow(nx, ny, t);
        var speed = Math.sqrt(v.vx*v.vx + v.vy*v.vy);

        p.x += v.vx * W * MOVE;
        p.y += v.vy * H * MOVE;
        p.age++;

        if (p.x < -20 || p.x > W+20 || p.y < -20 || p.y > H+20 || p.age > MAX_AGE) {
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.age = 0;
          continue;
        }

        var fadeIn  = Math.min(p.age / 25, 1);
        var fadeOut = 1 - Math.max(0, (p.age - MAX_AGE * 0.78) / (MAX_AGE * 0.22));
        var life    = fadeIn * fadeOut;
        var tailLen = Math.min(2 + speed * 270, 13);
        var headR   = Math.min(0.7 + speed * 52, 1.8);
        var alpha   = life * Math.min(0.03 + speed * 12, 0.16);

        if (alpha > 0.012) {
          drawTeardrop(p.x, p.y, Math.atan2(v.vy, v.vx), tailLen, headR, alpha);
        }
      }

      ctx.globalAlpha = 1;
      t += 0.007;
      requestAnimationFrame(tick);
    }

    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(tick);

    // Re-seed on resize (debounced)
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        W = c.width = window.innerWidth;
        H = c.height = window.innerHeight;
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
