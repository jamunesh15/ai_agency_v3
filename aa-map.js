/* ============================================================
   aa-map.js — dot-matrix world map generator

   Draws the world as a field of dots into any <svg data-dotmap>,
   then places labelled service nodes on top of it and wires them
   together. Keeps the markup clean: the map is ~1,700 dots that
   nobody wants to hand-author or read in a diff.

   <svg data-dotmap viewBox="0 0 1280 560">
     <g data-dotmap-field></g>   <- dots land here
     ... your nodes ...
   </svg>
   ============================================================ */

(function () {
  'use strict';

  /* Coarse landmass grid: 64 columns x 30 rows.
     Each row lists [startCol, endCol] spans that are land.
     col 0 = 180W, col 63 = 180E. row 0 = ~78N, row 29 = ~52S. */
  var LAND = [
    [[4, 10], [23, 26], [40, 58]],
    [[3, 12], [22, 27], [38, 60]],
    [[2, 14], [22, 28], [31, 33], [38, 61]],
    [[2, 16], [22, 27], [30, 34], [37, 62]],
    [[2, 17], [23, 26], [30, 35], [37, 62]],
    [[3, 18], [30, 36], [38, 62]],
    [[4, 19], [30, 38], [40, 62]],
    [[5, 20], [30, 40], [42, 61]],
    [[6, 21], [29, 41], [43, 60]],
    [[7, 21], [29, 42], [44, 58]],
    [[8, 20], [29, 42], [44, 56]],
    [[10, 19], [29, 41], [44, 54]],
    [[12, 18], [30, 40], [44, 52]],
    [[14, 19], [30, 39], [44, 51], [53, 56]],
    [[16, 20], [30, 39], [44, 50], [53, 57]],
    [[17, 22], [30, 39], [45, 49], [52, 57]],
    [[17, 24], [30, 40], [46, 48], [52, 58]],
    [[17, 25], [30, 40], [53, 58]],
    [[17, 26], [31, 40], [53, 58]],
    [[18, 26], [31, 40], [54, 58]],
    [[18, 26], [31, 40], [52, 59]],
    [[18, 25], [32, 40], [52, 60]],
    [[18, 25], [32, 39], [52, 60]],
    [[19, 24], [33, 39], [52, 60]],
    [[19, 24], [33, 38], [53, 59]],
    [[20, 24], [34, 37], [54, 58]],
    [[20, 23], [35, 36], [55, 57]],
    [[20, 23]],
    [[20, 22]],
    [[20, 21]]
  ];

  var COLS = 64;
  var ROWS = LAND.length;
  var NS = 'http://www.w3.org/2000/svg';

  function build(svg) {
    var field = svg.querySelector('[data-dotmap-field]');
    if (!field || field.childNodes.length) return;

    var box = svg.viewBox.baseVal;
    var w = box.width || 1280;
    var h = box.height || 560;

    // inset so nodes near the edge still have room to breathe
    var padX = w * 0.02;
    var padY = h * 0.04;
    var stepX = (w - padX * 2) / (COLS - 1);
    var stepY = (h - padY * 2) / (ROWS - 1);
    var r = Math.max(1.1, Math.min(stepX, stepY) * 0.16);

    var frag = document.createDocumentFragment();

    for (var row = 0; row < ROWS; row++) {
      var spans = LAND[row];
      for (var s = 0; s < spans.length; s++) {
        for (var col = spans[s][0]; col <= spans[s][1]; col++) {
          var dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('cx', (padX + col * stepX).toFixed(1));
          dot.setAttribute('cy', (padY + row * stepY).toFixed(1));
          dot.setAttribute('r', r.toFixed(2));
          frag.appendChild(dot);
        }
      }
    }

    field.appendChild(frag);
  }

  /* Hover behaviour for the network.

     Pointing at a node does three things at once:
       1. the dots around it light green, rippling outward
       2. every link touching it draws itself green, node to node
       3. that node and the ones it reaches darken their icons

     Wiring comes from the markup, not from a hardcoded table:
       node: data-node="wf" data-mx="230" data-my="190"
       link: class="map-live" data-link="wf ag"
     so adding a node or a connection means editing the HTML only. */
  /* hops from `start` to every other node, so the highlight can ripple
     outward across the graph instead of switching on all at once */
  function bfs(adjacency, start) {
    var depth = {};
    depth[start] = 0;
    var queue = [start];

    while (queue.length) {
      var id = queue.shift();
      var neighbours = adjacency[id] || [];
      for (var i = 0; i < neighbours.length; i++) {
        if (depth[neighbours[i]] === undefined) {
          depth[neighbours[i]] = depth[id] + 1;
          queue.push(neighbours[i]);
        }
      }
    }
    return depth;
  }

  /* Cursor spotlight. Dots light green around the pointer wherever it is
     on the map, not only when it lands on a node.

     Distance-checking ~900 dots on every mousemove would be wasteful, so
     the dots go into a grid of buckets one radius wide and only the nine
     buckets around the cursor are ever tested. Painting is also deferred
     to the next frame, so a fast sweep costs one pass per frame instead
     of one per mousemove event. */
  function wireSpotlight(svg) {
    var wrap = svg.parentElement;
    if (!wrap) return;

    var box = svg.viewBox.baseVal;
    var W = box.width || 1280;
    var H = box.height || 560;
    var R = +(svg.getAttribute('data-dotmap-radius') || 112);
    var CELL = R;

    var dots = Array.prototype.map.call(
      svg.querySelectorAll('[data-dotmap-field] circle'),
      function (el) { return { el: el, x: +el.getAttribute('cx'), y: +el.getAttribute('cy') }; }
    );
    if (!dots.length) return;

    var grid = {};
    dots.forEach(function (d) {
      var key = Math.floor(d.x / CELL) + ':' + Math.floor(d.y / CELL);
      (grid[key] = grid[key] || []).push(d);
    });

    var lit = [];
    var queued = false;
    var px = 0, py = 0;

    function paint() {
      queued = false;
      var cx = Math.floor(px / CELL);
      var cy = Math.floor(py / CELL);
      var next = [];

      for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
          var bucket = grid[(cx + i) + ':' + (cy + j)];
          if (!bucket) continue;
          for (var k = 0; k < bucket.length; k++) {
            var dx = bucket[k].x - px;
            var dy = bucket[k].y - py;
            if (dx * dx + dy * dy <= R * R) next.push(bucket[k].el);
          }
        }
      }

      for (var m = 0; m < lit.length; m++) {
        if (next.indexOf(lit[m]) === -1) lit[m].classList.remove('is-lit');
      }
      for (var n = 0; n < next.length; n++) next[n].classList.add('is-lit');
      lit = next;
    }

    wrap.addEventListener('mousemove', function (e) {
      var rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      px = (e.clientX - rect.left) / rect.width * W;
      py = (e.clientY - rect.top) / rect.height * H;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    });

    wrap.addEventListener('mouseleave', function () {
      lit.forEach(function (el) { el.classList.remove('is-lit'); });
      lit = [];
    });
  }

  function wireNodes(svg) {
    var wrap = svg.parentElement;
    if (!wrap) return;

    // the live links need their real length before the dash maths works
    // same normalisation the motion library uses: a calc() dash value will
    // not interpolate, so the path is rescaled to 1000 units and the CSS
    // keeps plain constants
    var lives = Array.prototype.slice.call(svg.querySelectorAll('.map-live'));
    lives.forEach(function (el) {
      var len = 0;
      try { len = el.getTotalLength(); } catch (err) { len = 0; }
      if (len) el.setAttribute('pathLength', 1000);
    });

    var nodes = Array.prototype.slice.call(wrap.querySelectorAll('[data-node]'));
    var byId = {};
    nodes.forEach(function (n) { byId[n.getAttribute('data-node')] = n; });

    // adjacency read straight off the markup, so rewiring the network
    // never means editing this file
    var adjacency = {};
    lives.forEach(function (l) {
      var ends = (l.getAttribute('data-link') || '').split(/\s+/);
      if (ends.length < 2) return;
      (adjacency[ends[0]] = adjacency[ends[0]] || []).push(ends[1]);
      (adjacency[ends[1]] = adjacency[ends[1]] || []).push(ends[0]);
    });

    nodes.forEach(function (node) {
      var id = node.getAttribute('data-node');

      // dots are handled by the cursor spotlight, so a node only owns the
      // links and the node darkening.
      // the whole network lights up, but it propagates outward from the
      // node under the cursor rather than switching on all at once.
      // depth comes from a breadth-first walk of the link graph.
      var depth = bfs(adjacency, id);
      var STEP = 240;

      function on() {
        lives.forEach(function (l) {
          var ends = (l.getAttribute('data-link') || '').split(/\s+/);
          var d = Math.min(
            depth[ends[0]] === undefined ? 99 : depth[ends[0]],
            depth[ends[1]] === undefined ? 99 : depth[ends[1]]
          );
          l.style.setProperty('--d', (d === 99 ? 0 : d * STEP) + 'ms');
          l.classList.add('is-live');
        });

        nodes.forEach(function (n) {
          var d = depth[n.getAttribute('data-node')];
          n.style.setProperty('--d', ((d === undefined ? 0 : d) * STEP) + 'ms');
          n.classList.add('is-connected');
        });
      }

      function off() {
        // everything releases together. keeping the stagger on exit
        // reads as a glitch rather than an animation.
        lives.forEach(function (l) {
          l.style.setProperty('--d', '0ms');
          l.classList.remove('is-live');
        });
        nodes.forEach(function (n) {
          n.style.setProperty('--d', '0ms');
          n.classList.remove('is-connected');
        });
      }

      node.addEventListener('mouseenter', on);
      node.addEventListener('mouseleave', off);
      node.addEventListener('focus', on);
      node.addEventListener('blur', off);
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-dotmap]'), function (svg) {
      build(svg);
      wireSpotlight(svg);
      wireNodes(svg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AAMap = { init: init };
})();
