/* RivicQ docs — nebula identity only. Light theme is not offered. */
(function () {
  var KEY = 'rivicq.theme';
  try { localStorage.setItem(KEY, 'dark'); } catch (e) { /* ignore */ }
  document.documentElement.setAttribute('data-theme', 'dark');
  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.setAttribute('hidden', 'true');
    btn.style.display = 'none';
  });
})();
