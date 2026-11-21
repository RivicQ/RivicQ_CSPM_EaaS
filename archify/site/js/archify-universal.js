(function () {
  if (document.documentElement.getAttribute('data-archify-universal') === '1') return;
  document.documentElement.setAttribute('data-archify-universal', '1');

  var stages = ['Finding', 'Analysis', 'Engineering', 'DevSecOps', 'Evidence'];
  var backdrop = document.createElement('div');
  backdrop.className = 'rvq-universal-backdrop';
  backdrop.setAttribute('data-archify-universal', 'backdrop');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.prepend(backdrop);

  var progress = document.createElement('div');
  progress.className = 'rvq-universal-progress';
  progress.setAttribute('data-archify-universal', 'progress');
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  var rail = document.createElement('div');
  rail.className = 'rvq-universal-rail';
  rail.setAttribute('data-archify-universal', 'rail');
  rail.setAttribute('aria-hidden', 'true');
  stages.forEach(function (stage, index) {
    var item = document.createElement('span');
    item.className = 'rvq-universal-rail-item';
    var dot = document.createElement('span');
    dot.className = 'rvq-universal-rail-dot';
    var label = document.createElement('span');
    label.className = 'rvq-universal-rail-label';
    label.textContent = stage;
    item.appendChild(dot);
    item.appendChild(label);
    rail.appendChild(item);
    if (index < stages.length - 1) {
      var link = document.createElement('span');
      link.className = 'rvq-universal-rail-link';
      rail.appendChild(link);
    }
  });

  var anchor = document.querySelector('header, nav, .site-nav, .site-header, .topbar');
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(rail, anchor.nextSibling);
  } else {
    document.body.insertBefore(rail, backdrop.nextSibling);
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.sys-card, .card, .panel, .receipt, .callout, article, section > div');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('rvq-universal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(targets, function (target) {
      if (target.closest('[data-archify-universal="rail"]')) return;
      target.classList.add('rvq-universal-reveal');
      observer.observe(target);
    });
  }

  var scheduled = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? window.scrollY / max : 0;
    progress.style.width = Math.max(0, Math.min(100, ratio * 100)).toFixed(2) + '%';
    scheduled = false;
  }
  function onScroll() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateProgress);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateProgress();
})();
