/* RivicQ marketing theme controller — shared by index.html and showcase.html.
   The inline snippet in each <head> applies the theme before first paint (no
   flash); this file wires the header toggle and keeps the labels in sync. */
(function () {
  var KEY = 'rivicq.theme';

  function read() {
    try {
      var stored = localStorage.getItem(KEY);
      if (stored === 'light' || stored === 'dark') return 'dark';
    } catch (e) { /* storage blocked */ }
    return 'dark';
  }

  function apply(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      var dark = mode === 'dark';
      buttons[i].textContent = dark ? '\u2600' : '\u263D';
      buttons[i].setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      buttons[i].setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  function toggle() {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    apply(next);
  }

  apply(read());
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (target && target.closest && target.closest('.theme-toggle')) toggle();
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function () {
      try { if (!localStorage.getItem(KEY)) apply(read()); } catch (e) { apply(read()); }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
