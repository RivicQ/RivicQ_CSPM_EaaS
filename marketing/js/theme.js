/* RivicQ marketing theme. Nebula is the designed default. Day is the light archive. Auto follows the OS. */
(function () {
  var KEY = 'rivicq.theme';

  function choiceOf(raw) {
    if (raw === 'nebula' || raw === 'harbor' || raw === 'dark') return 'nebula';
    if (raw === 'day' || raw === 'ledger' || raw === 'light') return 'day';
    if (raw === 'auto') return 'auto';
    return 'nebula';
  }

  function resolved(choice) {
    if (choice === 'nebula') return 'dark';
    if (choice === 'day') return 'light';
    var light = false;
    try { light = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches); } catch (e) {}
    return light ? 'light' : 'dark';
  }

  function label(choice) {
    if (choice === 'nebula') return 'Nebula';
    if (choice === 'day') return 'Day';
    return 'Auto';
  }

  function read() {
    try { return choiceOf(localStorage.getItem(KEY)); } catch (e) { return 'nebula'; }
  }

  function nextChoice(choice) {
    if (choice === 'auto') return 'nebula';
    if (choice === 'nebula') return 'day';
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
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'light' ? '#f6f3fb' : '#05040a');
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
