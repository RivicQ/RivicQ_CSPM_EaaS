/* RivicQ marketing theme. Auto follows the OS. Harbor is dark. Ledger is light. */
(function () {
  var KEY = 'rivicq.theme';

  function choiceOf(raw) {
    if (raw === 'harbor' || raw === 'dark') return 'harbor';
    if (raw === 'ledger' || raw === 'light') return 'ledger';
    return 'auto';
  }

  function resolved(choice) {
    if (choice === 'harbor') return 'dark';
    if (choice === 'ledger') return 'light';
    var light = false;
    try { light = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches); } catch (e) {}
    return light ? 'light' : 'dark';
  }

  function label(choice) {
    if (choice === 'harbor') return 'Harbor';
    if (choice === 'ledger') return 'Ledger';
    return 'Auto';
  }

  function read() {
    try { return choiceOf(localStorage.getItem(KEY)); } catch (e) { return 'auto'; }
  }

  function nextChoice(choice) {
    if (choice === 'auto') return 'harbor';
    if (choice === 'harbor') return 'ledger';
    return 'auto';
  }

  function apply(choice) {
    var mode = resolved(choice);
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-theme-choice', choice);
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      var upcoming = nextChoice(choice);
      buttons[i].textContent = label(choice);
      buttons[i].setAttribute('aria-label', 'Color scheme ' + label(choice) + '. Switch to ' + label(upcoming));
      buttons[i].setAttribute('title', 'Switch to ' + label(upcoming));
    }
  }

  function persist(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) { /* ignore */ }
    apply(choice);
  }

  persist(read());
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (target && target.closest && target.closest('.theme-toggle')) persist(nextChoice(read()));
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function () { if (read() === 'auto') apply('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
