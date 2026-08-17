/* ============================================================
   aa-motion.js — AIAgency motion primitives
   No dependencies. Pairs with aa-motion.css.

   Usage (plain HTML):
     <script src="aa-motion.js" defer></script>

   Usage (Next.js):
     import { initMotion } from '@/lib/aa-motion'
     useEffect(() => initMotion(), [])
     // initMotion returns a teardown function.

   Primitives, all driven by data attributes:
     data-reveal                fade + rise on enter
     data-reveal-group          stagger direct children
     data-draw                  svg path draws itself in
     data-flow                  pulse travels along an svg path
     data-orbit                 slow rotation, used once
     data-count="1240"          number counts up
     data-nav                   header shrinks past the fold
     data-accordion             open / close a disclosure
   ============================================================ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AAMotion = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAX_STAGGER_ITEMS = 6; // past this, everything shares the last delay

  /* ---------- shared observer helper ------------------------- */

  function observe(elements, onEnter) {
    if (!elements.length) return null;

    if (REDUCED || !('IntersectionObserver' in window)) {
      elements.forEach(onEnter);
      return null;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          onEnter(entry.target);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );

    elements.forEach(function (el) { io.observe(el); });
    return io;
  }

  function activate(el) {
    el.classList.add('aa-in');
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ---------- 1 + 2. reveal and reveal-group ----------------- */

  function setupReveal(scope, observers) {
    // write stagger delays before anything is observed
    $$('[data-reveal-group]', scope).forEach(function (group) {
      var step = parseInt(group.getAttribute('data-reveal-group'), 10);
      if (isNaN(step)) step = 70;

      $$(':scope > [data-reveal]', group).forEach(function (child, i) {
        var index = Math.min(i, MAX_STAGGER_ITEMS - 1);
        child.style.setProperty('--aa-delay', index * step + 'ms');
      });
    });

    var items = $$('[data-reveal]', scope);

    items.forEach(function (el) {
      el.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'opacity') return;
        el.classList.add('aa-done');
        el.removeEventListener('transitionend', handler);
      });
    });

    observers.push(observe(items, activate));
  }

  /* ---------- 3 + 4. draw and flow --------------------------- */
  /* both need the real path length written into --aa-len so the
     dash maths works at any viewBox size.                        */

  /* Normalises the path to 1000 units so the dash maths in CSS can be
     plain constants.

     This is not a nicety. A keyframe written as
       from { stroke-dashoffset: calc(var(--aa-len) + var(--aa-dash)) }
     resolves to calc(740px), and browsers will not interpolate a calc()
     against a plain 0px. They fall back to discrete animation, so the
     dash snaps at the halfway point instead of travelling and the whole
     effect silently does nothing.

     --aa-len is still published, but only for picking a duration. */
  function measure(el) {
    var len;
    try {
      len = el.getTotalLength();
    } catch (err) {
      len = 0; // non-geometry element, or detached
    }
    if (!len) return false;
    el.setAttribute('pathLength', 1000);
    el.style.setProperty('--aa-len', Math.ceil(len));
    return true;
  }

  function setupPaths(scope, observers) {
    // paths that only need their length published, with no animation of
    // their own. hover-driven overlays use this.
    $$('[data-measure]', scope).forEach(measure);

    var drawn = $$('[data-draw]', scope).filter(measure);
    observers.push(observe(drawn, activate));

    var flows = $$('[data-flow]', scope).filter(measure);
    flows.forEach(function (el) {
      // an author-set duration wins. diagrams that sync something else to
      // the pulse (a box lighting up as it arrives) need every spoke on
      // one clock, which per-length timing would break.
      if (el.getAttribute('style') && /--aa-flow-dur/.test(el.getAttribute('style'))) return;

      // otherwise scale the loop to the wire so short and long paths read
      // at the same speed rather than the same duration. the floor has to
      // stay well under the shortest real path or every wire collapses
      // back to one duration and the effect is lost.
      var len = parseFloat(el.style.getPropertyValue('--aa-len'));
      var seconds = Math.max(1.6, Math.min(6, len / 150));
      el.style.setProperty('--aa-flow-dur', seconds.toFixed(2) + 's');
    });
    observers.push(observe(flows, activate));

    observers.push(observe($$('[data-orbit]', scope), activate));
  }

  /* ---------- 6. count --------------------------------------- */

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    var decimals = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;
    var duration = parseInt(el.getAttribute('data-count-duration'), 10) || 1100;
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';

    var write = function (value) {
      el.textContent = prefix + value.toFixed(decimals) + suffix;
    };

    if (REDUCED) { write(target); return; }

    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      write(target * easeOutCubic(t));
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function setupCount(scope, observers) {
    var els = $$('[data-count]', scope);
    els.forEach(function (el) {
      // hold the final width from the start so nothing reflows mid-count
      var prefix = el.getAttribute('data-count-prefix') || '';
      var suffix = el.getAttribute('data-count-suffix') || '';
      var decimals = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;
      el.textContent = prefix + (0).toFixed(decimals) + suffix;
    });
    observers.push(observe(els, runCount));
  }

  /* ---------- 6b. marquee ------------------------------------ */
  /* Duplicates the track once so translateX(-50%) lands exactly on the
     start of the copy. Without the clone the loop visibly snaps. */

  function setupMarquee(scope) {
    $$('[data-marquee]', scope).forEach(function (rail) {
      var track = rail.firstElementChild;
      if (!track || track.dataset.cloned) return;

      var speed = parseFloat(rail.getAttribute('data-marquee-speed')) || 60; // px per second
      var width = track.scrollWidth;

      Array.prototype.slice.call(track.children).forEach(function (item) {
        var copy = item.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      });

      track.dataset.cloned = '1';
      // duration follows content width, so rows with different item
      // counts still scroll at the same visual speed
      track.style.setProperty('--aa-mq-dur', (width / speed).toFixed(1) + 's');
    });
  }

  /* ---------- 6c. typewriter ---------------------------------- */
  /* Types each row out character by character, then hands off to an
     optional follow-on element, holds, and loops.

     Rows are clipped by animating width rather than by rewriting text,
     so syntax highlighting markup inside them survives untouched.
     steps(n) makes the clip edge land on character boundaries instead
     of sliding through glyphs. */

  function setupTypewriter(scope, observers, teardowns) {
    $$('[data-typewriter]', scope).forEach(function (box) {
      var sel = box.getAttribute('data-typewriter-rows');
      var rows = sel ? $$(sel, box) : $$(':scope > *', box);
      if (!rows.length) return;

      var cps = parseFloat(box.getAttribute('data-typewriter')) || 34;
      var hold = parseInt(box.getAttribute('data-typewriter-hold'), 10) || 4200;
      var thenSel = box.getAttribute('data-typewriter-then');
      var then = thenSel ? document.querySelector(thenSel) : null;

      // measure at natural width, before anything gets clipped
      var plan = rows.map(function (el) {
        var chars = el.textContent.length;
        return {
          el: el,
          w: el.scrollWidth,
          steps: Math.max(1, chars),
          dur: Math.max(70, (chars / cps) * 1000)
        };
      });

      if (REDUCED) {
        if (then) then.classList.add('is-running');
        box.classList.add('is-done');
        return;
      }

      rows.forEach(function (el) {
        el.style.overflow = 'hidden';
        el.style.whiteSpace = 'pre';
        el.style.width = '0px';
      });

      var timers = [];
      var stopped = false;

      function cycle() {
        if (stopped) return;
        var t = 0;

        plan.forEach(function (p) {
          timers.push(setTimeout(function () {
            p.el.classList.add('is-typing');
            p.el.animate(
              [{ width: '0px' }, { width: p.w + 'px' }],
              { duration: p.dur, easing: 'steps(' + p.steps + ', end)', fill: 'forwards' }
            );
            timers.push(setTimeout(function () {
              p.el.classList.remove('is-typing');
            }, p.dur));
          }, t));
          t += p.dur + 80;
        });

        timers.push(setTimeout(function () {
          box.classList.add('is-done');
          if (then) then.classList.add('is-running');
        }, t));

        timers.push(setTimeout(function () {
          box.classList.remove('is-done');
          if (then) then.classList.remove('is-running');
          rows.forEach(function (el) {
            el.getAnimations().forEach(function (a) { a.cancel(); });
            el.style.width = '0px';
          });
          cycle();
        }, t + hold));
      }

      observers.push(observe([box], function () { cycle(); }));
      teardowns.push(function () {
        stopped = true;
        timers.forEach(clearTimeout);
      });
    });
  }

  /* ---------- 7. nav ----------------------------------------- */

  function setupNav(scope, teardowns) {
    var nav = (scope || document).querySelector('[data-nav]');
    if (!nav) return;

    var threshold = parseInt(nav.getAttribute('data-nav'), 10);
    if (isNaN(threshold)) threshold = 24;

    var ticking = false;

    function apply() {
      nav.classList.toggle('aa-stuck', window.scrollY > threshold);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    teardowns.push(function () {
      window.removeEventListener('scroll', onScroll);
    });
  }

  /* ---------- 8. accordion ----------------------------------- */

  function setupAccordion(scope, teardowns) {
    $$('[data-accordion]', scope).forEach(function (item) {
      var trigger = item.querySelector('.aa-acc-trigger');
      var body = item.querySelector('.aa-acc-body');
      if (!trigger || !body) return;

      // wire up aria without asking the markup to repeat itself
      if (!body.id) body.id = 'aa-acc-' + Math.random().toString(36).slice(2, 8);
      trigger.setAttribute('aria-controls', body.id);
      trigger.setAttribute('aria-expanded', item.classList.contains('aa-open'));

      function toggle() {
        var open = item.classList.toggle('aa-open');
        trigger.setAttribute('aria-expanded', open);
      }

      trigger.addEventListener('click', toggle);
      teardowns.push(function () {
        trigger.removeEventListener('click', toggle);
      });
    });
  }

  /* ---------- init ------------------------------------------- */

  function initMotion(scope) {
    var root = scope || document;
    var observers = [];
    var teardowns = [];

    setupReveal(root, observers);
    setupPaths(root, observers);
    setupCount(root, observers);
    setupMarquee(root);
    setupTypewriter(root, observers, teardowns);
    setupNav(root, teardowns);
    setupAccordion(root, teardowns);

    return function teardown() {
      observers.forEach(function (io) { if (io) io.disconnect(); });
      teardowns.forEach(function (fn) { fn(); });
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initMotion(); });
    } else {
      initMotion();
    }
  }

  return { initMotion: initMotion, reduced: REDUCED };
});
