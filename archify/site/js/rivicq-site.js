/* ════════════════════════════════════════════════════════════════
   RIVICQ · product site interactions
   Theme + diagram theme sync · pinned live stage · type previews ·
   compare slider · agent tabs · copy · nav state · fade-up reveals
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var doc = document;
  doc.documentElement.classList.add('js');

  var THEME_KEY = 'rivicq-site-theme';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function currentTheme() {
    /* Nebula identity only — light theme is not offered on the product site. */
    return 'dark';
  }

  /* ── Diagram theme sync (best-effort same-origin) ──────────── */
  function syncFrameTheme(frame) {
    var forced = frame.getAttribute('data-force-theme');
    var theme = forced || currentTheme();
    try {
      var cdoc = frame.contentDocument;
      if (cdoc && cdoc.documentElement) {
        cdoc.documentElement.setAttribute('data-theme', theme);
        cdoc.documentElement.style.colorScheme = theme;
      }
    } catch (e) { /* cross-origin (file://) — leave the diagram default */ }
  }

  function syncAllFrames() {
    var frames = doc.querySelectorAll('iframe[data-sync-theme]');
    for (var i = 0; i < frames.length; i++) syncFrameTheme(frames[i]);
  }

  /* ── Theme (nebula / dark only) ────────────────────────────── */
  var themeMeta = doc.querySelector('meta[name="theme-color"]');
  function applyTheme(theme) {
    root.setAttribute('data-theme', 'dark');
    try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
    if (themeMeta) themeMeta.setAttribute('content', '#000000');
    var toggle = doc.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.setAttribute('hidden', 'true');
      toggle.style.display = 'none';
    }
    syncAllFrames();
  }

  applyTheme('dark');
  var themeToggle = doc.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.setAttribute('hidden', 'true');
    themeToggle.style.display = 'none';
  }

  // Re-apply theme to each diagram right after it finishes loading.
  doc.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'IFRAME' && e.target.hasAttribute('data-sync-theme')) {
      syncFrameTheme(e.target);
    }
  }, true);

  /* ── Nav scrolled state ────────────────────────────────────── */
  function navState() {
    doc.body.classList.toggle('nav-scrolled', window.scrollY > 8);
  }

  /* ── Copy buttons ──────────────────────────────────────────── */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      doc.body.appendChild(ta);
      ta.select();
      try { doc.execCommand('copy'); resolve(); } catch (e) { reject(e); }
      doc.body.removeChild(ta);
    });
  }

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.cmd-copy');
    if (!btn) return;
    var text = btn.getAttribute('data-copy-text');
    if (!text) {
      var fromId = btn.getAttribute('data-copy-from');
      var src = fromId && doc.getElementById(fromId);
      if (src) text = src.textContent.replace(/^\s*\$\s*/, '');
    }
    if (!text) return;
    copyText(text).then(function () {
      var label = btn.querySelector('.cmd-copy-label');
      var prev = label ? label.textContent : null;
      btn.classList.add('is-copied');
      if (label) label.textContent = 'Copied!';
      window.setTimeout(function () {
        btn.classList.remove('is-copied');
        if (label && prev !== null) label.textContent = prev;
      }, 1600);
    }).catch(function () {});
  });

  /* ════════════════════════════════════════════════════════════
     PINNED LIVE STAGE
     ════════════════════════════════════════════════════════════ */
  var PROOFS = {
    architecture: {
      file: 'rivicq-architecture.html',
      meta: 'Architecture · Blueprint · 13 nodes · 12 edges',
      title: 'Platform Architecture — one engine, two editions, deny by default',
      beats: ['#overview', '#focus=api&reach=downstream', '#focus=boms&reach=upstream', '#lens=security~database']
    },
    scanning: {
      file: 'rivicq-scanning-sequence.html',
      meta: 'Sequence · Signal Flow · 6 participants · 11 messages',
      title: 'Scan Request — auth first, evidence always',
      beats: ['#overview', '#focus=web&reach=downstream', '#focus=evidence&reach=upstream', '#lens=security~database']
    },
    analysis: {
      file: 'rivicq-analysis-workflow.html',
      meta: 'Workflow · Signal Flow · 8 nodes · 8 edges',
      title: 'Analysis Pipeline — fingerprint, gate, evidence',
      beats: ['#overview', '#focus=gate&reach=downstream', '#focus=classify&reach=upstream', '#lens=security~backend']
    },
    compliance: {
      file: 'rivicq-compliance-workflow.html',
      meta: 'Workflow · Signal Flow · 7 nodes · 7 edges',
      title: 'Compliance & Evidence — map, attest, or waive',
      beats: ['#overview', '#focus=standards&reach=downstream', '#focus=collect&reach=upstream', '#lens=security~database']
    }
  };

  var BEAT_COPY = [
    { title: 'The whole system, in one readable frame.', body: 'This is the real generated artifact, not a screenshot. Lanes, boundaries, and every authored edge — scroll to move its camera.' },
    { title: 'Focus one node, see what it drives.', body: 'Press Enter on any node — or open a stable link — and the camera isolates everything downstream of it.' },
    { title: 'Flip the reach. Find the cause.', body: 'Trace upstream to every dependency that feeds a step. Same file, same authored relationships, one hash change.' },
    { title: 'Compare by meaning, not by box.', body: 'Lens keeps only the semantic kinds you name — security against data, backend against storage — and quiets the rest.' }
  ];

  var stage = doc.getElementById('tour');
  var stageWindow = doc.getElementById('hero-proof-stage');
  var frame = doc.getElementById('hero-proof-frame');
  var addressFile = doc.getElementById('address-file');
  var addressHash = doc.getElementById('address-hash');
  var proofMeta = doc.getElementById('proof-meta');
  var proofTitle = doc.getElementById('proof-title');
  var beatTitle = doc.getElementById('beat-title');
  var beatBody = doc.getElementById('beat-body');
  var beatCard = doc.querySelector('.beat-card');
  var proofOpen = doc.getElementById('proof-open');
  var proofTabs = Array.prototype.slice.call(doc.querySelectorAll('.spec-card[data-proof]'));
  var beatTicks = Array.prototype.slice.call(doc.querySelectorAll('.beat-tick[data-beat]'));

  var currentProof = 'architecture';
  var currentBeat = 0;

  function diagramBase(file) {
    return '../diagrams/' + file + '?embed=1&theme=' + currentTheme();
  }

  function setFrameHash(hash) {
    if (!frame || !hash) return;
    try {
      if (frame.contentWindow) frame.contentWindow.location.hash = hash;
    } catch (e) {
      // cross-origin / not yet navigable — fall back to a full reload with the hash
      if (frame.contentWindow && frame.getAttribute('src').indexOf(hash) === -1) {
        frame.src = diagramBase(PROOFS[currentProof].file) + hash;
      }
    }
    if (addressHash) addressHash.textContent = hash;
  }

  function renderBeat() {
    var copy = BEAT_COPY[Math.min(currentBeat, BEAT_COPY.length - 1)];
    if (beatTitle) beatTitle.textContent = copy.title;
    if (beatBody) beatBody.textContent = copy.body;
    if (beatCard) {
      beatCard.classList.remove('is-swapping');
      void beatCard.offsetWidth;
      beatCard.classList.add('is-swapping');
    }
    beatTicks.forEach(function (t, i) {
      t.setAttribute('aria-pressed', i === currentBeat ? 'true' : 'false');
    });
  }

  function applyBeat(newBeat, opts) {
    var p = PROOFS[currentProof];
    newBeat = Math.max(0, Math.min(newBeat, p.beats.length - 1));
    if (newBeat === currentBeat && !(opts && opts.force)) {
      if (opts && opts.hash) setFrameHash(p.beats[newBeat]);
      return;
    }
    currentBeat = newBeat;
    renderBeat();
    setFrameHash(p.beats[currentBeat]);
  }

  function loadProof(key, beat) {
    if (!PROOFS[key]) return;
    currentProof = key;
    var p = PROOFS[key];
    var hash = p.beats[typeof beat === 'number' ? beat : 0];
    if (stageWindow) stageWindow.classList.add('is-loading');
    if (addressFile) addressFile.textContent = p.file;
    if (proofMeta) proofMeta.textContent = p.meta;
    if (proofTitle) proofTitle.textContent = p.title;
    if (proofOpen) proofOpen.setAttribute('href', '../diagrams/' + p.file + '?present=1' + hash);
    if (frame) frame.src = diagramBase(p.file) + hash;
    currentBeat = -1; // force the beat to re-render
    applyBeat(typeof beat === 'number' ? beat : 0, { force: true });
    if (addressHash) addressHash.textContent = hash;
  }

  proofTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      proofTabs.forEach(function (t) {
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        t.setAttribute('tabindex', t === tab ? '0' : '-1');
      });
      loadProof(tab.getAttribute('data-proof'), 0);
      scrollStageTo(0);
    });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var idx = (proofTabs.indexOf(tab) + dir + proofTabs.length) % proofTabs.length;
      proofTabs[idx].focus();
      proofTabs[idx].click();
    });
  });

  beatTicks.forEach(function (tick) {
    tick.addEventListener('click', function () {
      applyBeat(parseInt(tick.getAttribute('data-beat'), 10), { force: true });
      scrollStageTo(currentBeat);
    });
  });

  if (frame) {
    frame.addEventListener('load', function () {
      if (stageWindow) stageWindow.classList.remove('is-loading');
      syncFrameTheme(frame);
      if (addressHash) addressHash.textContent = PROOFS[currentProof].beats[Math.max(currentBeat, 0)];
    });
  }

  /* Scroll-driven stage: tilt on entry, advance beats while pinned */
  var stageTop = 0;
  var stageSpan = 0;
  function measureStage() {
    if (!stage) return;
    var rect = stage.getBoundingClientRect();
    stageTop = rect.top + window.scrollY;
    stageSpan = Math.max(1, stage.offsetHeight - window.innerHeight);
  }

  function scrollStageTo(beat) {
    if (!stage) return;
    measureStage();
    var p = (beat + 0.5) / BEAT_COPY.length;
    window.scrollTo({ top: stageTop + p * stageSpan, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  var ticking = false;
  function onScroll() {
    navState();
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      if (stage) {
        measureStage();
        var progressed = Math.min(Math.max(window.scrollY - stageTop, 0), stageSpan);
        var p = progressed / stageSpan;
        stage.style.setProperty('--enter', Math.min(1, p * 4).toFixed(3));
        if (window.scrollY >= stageTop - window.innerHeight * 0.5) {
          var beat = Math.min(BEAT_COPY.length - 1, Math.floor(p * BEAT_COPY.length));
          if (beat !== currentBeat) applyBeat(beat);
        }
      }
      revealVisibleFades();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measureStage(); revealVisibleFades(); }, { passive: true });

  /* ════════════════════════════════════════════════════════════
     TYPE PREVIEWS
     ════════════════════════════════════════════════════════════ */
  var typeItems = Array.prototype.slice.call(doc.querySelectorAll('.type-item[data-type]'));
  var typeFrames = Array.prototype.slice.call(doc.querySelectorAll('#type-preview iframe[data-type]'));
  function selectType(type) {
    typeItems.forEach(function (item) {
      var on = item.getAttribute('data-type') === type;
      item.classList.toggle('is-active', on);
      var b = item.querySelector('button');
      if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    typeFrames.forEach(function (f) {
      f.classList.toggle('is-active', f.getAttribute('data-type') === type);
    });
  }
  typeItems.forEach(function (item) {
    var b = item.querySelector('button');
    if (!b) return;
    b.addEventListener('click', function () { selectType(item.getAttribute('data-type')); });
    b.addEventListener('mouseenter', function () { selectType(item.getAttribute('data-type')); });
  });

  /* ════════════════════════════════════════════════════════════
     COMPARE SLIDER
     ════════════════════════════════════════════════════════════ */
  var compareStage = doc.getElementById('compare-stage');
  var compareRange = doc.getElementById('compare-range');
  if (compareStage && compareRange) {
    var setSplit = function (v) { compareStage.style.setProperty('--split', v + '%'); };
    compareRange.addEventListener('input', function () { setSplit(compareRange.value); });
    setSplit(compareRange.value);
  }

  /* ════════════════════════════════════════════════════════════
     AGENT / LANE TABS
     ════════════════════════════════════════════════════════════ */
  var agentTabs = Array.prototype.slice.call(doc.querySelectorAll('[data-agent]'));
  var agentPanes = Array.prototype.slice.call(doc.querySelectorAll('[data-agent-pane]'));
  agentTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.getAttribute('data-agent');
      agentTabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
      agentPanes.forEach(function (pane) { pane.hidden = pane.getAttribute('data-agent-pane') !== key; });
    });
  });

  /* ════════════════════════════════════════════════════════════
     HERO POINTER GLOW
     ════════════════════════════════════════════════════════════ */
  var hero = doc.querySelector('.hero');
  if (hero && !reduceMotion) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      hero.classList.add('is-pointing');
    });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('is-pointing'); });
  }

  /* ════════════════════════════════════════════════════════════
     FADE-UP REVEALS
     ════════════════════════════════════════════════════════════ */
  var faders = Array.prototype.slice.call(doc.querySelectorAll('.fade-up'));
  var faderIO = null;
  function revealVisibleFades() {
    if (reduceMotion) return;
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    for (var i = faders.length - 1; i >= 0; i--) {
      var el = faders[i];
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        el.classList.add('visible');
        if (faderIO) faderIO.unobserve(el);
        faders.splice(i, 1);
      }
    }
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    faderIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          faderIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    faders.forEach(function (el) { faderIO.observe(el); });
  } else {
    faders.forEach(function (el) { el.classList.add('visible'); });
    faders = [];
  }

  /* ── init ──────────────────────────────────────────────────── */
  navState();
  measureStage();
  syncAllFrames();
  applyBeat(0, { force: true });
  revealVisibleFades();
})();