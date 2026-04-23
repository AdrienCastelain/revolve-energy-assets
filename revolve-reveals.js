/* ============================================================
   Revolve Energy — Scroll & Hero Reveal Animations
   Version: 1.0.0 (2026-04-22)
   Paste at the END of Webflow Site Settings -> Footer Code,
   AFTER the existing Barba + curtain + Splide block.

   Class contract (applied in Designer):
     .hero-reveal     section_hero container (one per page)
         Inside it, custom attributes on children:
           data-hero="visual"           image / slideshow image wrapper
           data-hero="visual-controls"  slideshow title + arrows (lifts from behind visual)
           data-hero="pattern"          decorative pattern (fades + small lift alongside visual)
           data-hero="overline"         pretitle / eyebrow
           data-hero="title"            H1
           data-hero="subtitle"         lede paragraph
           data-hero="cta"              primary button or link
     .text-reveal     paragraphs + sub-hero titles (H2/H3/H4)
     .block-reveal    cards, overlines, decor, case-study tiles

   Rules:
     - One reveal per element. Never nest .text-reveal or .block-reveal
       inside .hero-reveal — the hero owns its children.
     - Re-fires on every Barba afterEnter.
     - Honors prefers-reduced-motion (opacity-only, no translate).
     - Mobile (<768px): distances -40%, durations -25%.
   ============================================================ */

(function () {
  'use strict';

  var VERSION = '1.0.0';
  var GSAP_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/';
  var MOBILE_Q = '(max-width: 767px)';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var activeScrollTriggers = [];
  var activeSplits = [];

  // ---------- plugin bootstrap ----------

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensurePlugins() {
    if (!window.gsap) return Promise.reject(new Error('gsap not found'));
    var tasks = [];
    if (!window.ScrollTrigger) tasks.push(loadScript(GSAP_CDN + 'ScrollTrigger.min.js'));
    if (!window.SplitText) tasks.push(loadScript(GSAP_CDN + 'SplitText.min.js'));
    return Promise.all(tasks).then(function () {
      if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
      if (window.SplitText) gsap.registerPlugin(SplitText);
    });
  }

  // ---------- helpers ----------

  function isMobile() {
    return window.matchMedia(MOBILE_Q).matches;
  }

  function inHero(el) {
    return !!el.closest('.hero-reveal');
  }

  // ---------- scroll reveals ----------

  var SCROLL_REVEALS = [
    { cls: 'text-reveal',  y: 12, dur: 0.6, ease: 'power2.out', start: 'top 80%' },
    { cls: 'block-reveal', y: 16, dur: 0.7, ease: 'expo.out',   start: 'top 80%' }
  ];

  function primeScrollReveals(root) {
    SCROLL_REVEALS.forEach(function (cfg) {
      root.querySelectorAll('.' + cfg.cls).forEach(function (el) {
        if (el.dataset.revealPrimed === '1') return;
        if (inHero(el)) return;
        el.dataset.revealPrimed = '1';
        if (REDUCED) {
          gsap.set(el, { opacity: 1, y: 0 });
        } else {
          gsap.set(el, { opacity: 0, y: cfg.y });
        }
      });
    });
  }

  function armScrollReveals(root) {
    if (REDUCED) return;
    SCROLL_REVEALS.forEach(function (cfg) {
      root.querySelectorAll('.' + cfg.cls).forEach(function (el) {
        if (el.dataset.revealArmed === '1') return;
        if (inHero(el)) return;
        el.dataset.revealArmed = '1';

        var st = ScrollTrigger.create({
          trigger: el,
          start: cfg.start,
          once: true,
          onEnter: function () {
            var mobile = isMobile();
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration: cfg.dur * (mobile ? 0.75 : 1),
              ease: cfg.ease
            });
          }
        });
        activeScrollTriggers.push(st);
      });
    });
  }

  // ---------- hero reveal ----------

  function primeLineMask(el, distMul) {
    if (!el) return null;
    if (window.SplitText) {
      try {
        var split = new SplitText(el, { type: 'lines', linesClass: 'reveal-line', mask: 'lines' });
        activeSplits.push(split);
        gsap.set(split.lines, { yPercent: 100 });
        return split;
      } catch (e) { /* fall through */ }
    }
    gsap.set(el, { opacity: 0, y: 14 * distMul });
    return null;
  }

  function primeHero(root) {
    var hero = root.querySelector('.hero-reveal');
    if (!hero) return;
    if (hero.dataset.heroPrimed === '1') return;
    hero.dataset.heroPrimed = '1';

    if (REDUCED) return;

    var distMul = isMobile() ? 0.6 : 1;
    var visual   = hero.querySelector('[data-hero="visual"]');
    var controls = hero.querySelector('[data-hero="visual-controls"]');
    var pattern  = hero.querySelector('[data-hero="pattern"]');
    var overline = hero.querySelector('[data-hero="overline"]');
    var title    = hero.querySelector('[data-hero="title"]');
    var subtitle = hero.querySelector('[data-hero="subtitle"]');
    var cta      = hero.querySelector('[data-hero="cta"]');

    if (visual)   gsap.set(visual,   { clipPath: 'inset(100% 0 0 0)' });
    if (pattern)  gsap.set(pattern,  { opacity: 0, y: 8 * distMul });
    if (subtitle) gsap.set(subtitle, { opacity: 0, y: 12 * distMul });
    if (cta)      gsap.set(cta,      { opacity: 0, y: 8 * distMul });
    if (controls) gsap.set(controls, { opacity: 0, y: 24 * distMul });

    // Split overline and title NOW — lines hidden below their masks. Stored on the hero
    // element so runHero can retrieve and animate them without re-splitting.
    hero._revolveOverlineSplit = primeLineMask(overline, distMul);
    hero._revolveTitleSplit    = primeLineMask(title,    distMul);
  }

  function runHero(root) {
    var hero = root.querySelector('.hero-reveal');
    if (!hero) return;
    if (hero.dataset.heroRan === '1') return;
    hero.dataset.heroRan = '1';

    var visual   = hero.querySelector('[data-hero="visual"]');
    var controls = hero.querySelector('[data-hero="visual-controls"]');
    var pattern  = hero.querySelector('[data-hero="pattern"]');
    var overline = hero.querySelector('[data-hero="overline"]');
    var title    = hero.querySelector('[data-hero="title"]');
    var subtitle = hero.querySelector('[data-hero="subtitle"]');
    var cta      = hero.querySelector('[data-hero="cta"]');

    if (REDUCED) {
      [visual, controls, pattern, overline, title, subtitle, cta].forEach(function (el) {
        if (!el) return;
        gsap.set(el, { opacity: 1, clearProps: 'transform,clipPath' });
      });
      return;
    }

    var mobile = isMobile();
    var durMul = mobile ? 0.75 : 1;

    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    // 1. Visual — clip-path mask wipe bottom-up
    if (visual) tl.to(visual, { clipPath: 'inset(0% 0 0 0)', duration: 1.0 * durMul }, 0);

    // 1b. Pattern — soft fade + tiny y-lift, fires alongside the visual wipe
    if (pattern) tl.to(pattern, { opacity: 1, y: 0, duration: 0.9 * durMul, ease: 'power2.out' }, 0.05);

    // 2. Overline — animate the split lines primed earlier
    var ovSplit = hero._revolveOverlineSplit;
    if (ovSplit && ovSplit.lines) {
      tl.to(ovSplit.lines, { yPercent: 0, duration: 0.7 * durMul, stagger: 0.06 }, 0.15);
    } else if (overline) {
      tl.to(overline, { opacity: 1, y: 0, duration: 0.7 * durMul, ease: 'power2.out' }, 0.15);
    }

    // 3. H1 — animate the split lines primed earlier
    var tSplit = hero._revolveTitleSplit;
    if (tSplit && tSplit.lines) {
      tl.to(tSplit.lines, { yPercent: 0, duration: 0.9 * durMul, stagger: 0.09 }, 0.25);
    } else if (title) {
      tl.to(title, { opacity: 1, y: 0, duration: 0.9 * durMul, ease: 'power2.out' }, 0.25);
    }

    // 4. Subtitle — y-fade
    if (subtitle) tl.to(subtitle, { opacity: 1, y: 0, duration: 0.6 * durMul, ease: 'power2.out' }, 0.55);

    // 5. CTA — y-fade
    if (cta) tl.to(cta, { opacity: 1, y: 0, duration: 0.5 * durMul, ease: 'power2.out' }, 0.75);

    // 6. Visual controls (slide title + arrows) — lift from behind the visual after it reveals
    if (controls) tl.to(controls, { opacity: 1, y: 0, duration: 0.6 * durMul, ease: 'power2.out' }, 0.95);
  }

  // ---------- cleanup ----------

  function killAll() {
    activeScrollTriggers.forEach(function (st) { try { st.kill(); } catch (e) {} });
    activeScrollTriggers = [];
    activeSplits.forEach(function (s) { try { s.revert(); } catch (e) {} });
    activeSplits = [];
  }

  // ---------- lifecycle ----------

  function initReveals(root) {
    root = root || document;
    primeScrollReveals(root);   // hide scroll-reveal elements
    primeHero(root);            // hide hero initial state
    runHero(root);              // fire hero timeline
    armScrollReveals(root);     // arm scroll triggers
  }

  function waitForPreloaderDone() {
    // Preloader adds `is-loaded` to <html> on complete (and synchronously on skip).
    if (document.documentElement.classList.contains('is-loaded')) return Promise.resolve();
    return new Promise(function (resolve) {
      var obs = new MutationObserver(function () {
        if (document.documentElement.classList.contains('is-loaded')) { obs.disconnect(); resolve(); }
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      // Safety: never hang
      setTimeout(function () { obs.disconnect(); resolve(); }, 4000);
    });
  }

  function boot() {
    ensurePlugins()
      .then(function () { return (document.fonts && document.fonts.ready) || Promise.resolve(); })
      .then(function () {
        // Prime scroll-reveal opacity:0 BEFORE waiting for preloader so
        // elements don't flash visible behind the splash.
        primeScrollReveals(document);
        return waitForPreloaderDone();
      })
      .then(function () {
        primeHero(document);
        runHero(document);
        armScrollReveals(document);

        if (window.barba && window.barba.hooks) {
          window.barba.hooks.beforeLeave(killAll);
          // Prime new container WHILE curtain is still covering, so nothing flashes when curtain exits.
          window.barba.hooks.beforeEnter(function (data) {
            var container = (data && data.next && data.next.container) || document;
            primeScrollReveals(container);
            primeHero(container);
          });
          // Curtain has exited — run the hero timeline and arm scroll triggers.
          window.barba.hooks.afterEnter(function (data) {
            var container = (data && data.next && data.next.container) || document;
            requestAnimationFrame(function () {
              runHero(container);
              armScrollReveals(container);
              if (window.ScrollTrigger) ScrollTrigger.refresh();
            });
          });
        }

        window.addEventListener('load', function () {
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        });
      })
      .catch(function (err) {
        // Fail safe: make sure nothing is stuck at opacity:0
        document.querySelectorAll('.text-reveal, .block-reveal, [data-hero]').forEach(function (el) {
          el.style.opacity = '';
          el.style.transform = '';
        });
        if (window.console) console.warn('[revolve-reveals ' + VERSION + '] disabled:', err && err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
