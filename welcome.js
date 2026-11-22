/* FreshMart RSMS - welcome.js
   Shows an animated welcome screen between sign-in and the dashboard.
   It only wraps startSession(); it does not change any login or app logic. */
(function () {
  const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 12h22l-2.2 12.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L5 12Z" fill="currentColor"/><path d="M11 12c0-3.3 2.2-6 5-6s5 2.7 5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 21c-2.8 0-4.4-1.8-4.6-4.2 2.6-.2 4.5 1.1 4.6 4.2Zm0 0c0-3 1.9-4.4 4.6-4.2-.2 2.4-1.8 4.2-4.6 4.2Z" fill="#1d5b45"/></svg>';
  const STEPS = ['Opening the till', 'Checking shelves and stock levels', 'Syncing today\u2019s sales', 'Your store is ready'];
  let timer = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function close() {
    const el = document.getElementById('welcomeScreen');
    if (!el) return;
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 650);
  }
  function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') close(); }

  function show() {
    if (document.getElementById('welcomeScreen')) return;
    let name = 'there', role = '';
    try {
      name = (state.currentUser.name || 'there').split(' ')[0];
      role = formatRole(state.currentUser.role);
    } catch (e) { /* fall back to a generic greeting */ }
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.createElement('div');
    el.id = 'welcomeScreen';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="ws-glow"></div>' +
      '<div class="ws-inner">' +
        '<div class="ws-mark"><span class="ws-ring"></span><span class="ws-ring ws-ring2"></span><div class="ws-logo">' + LOGO + '</div></div>' +
        '<p class="ws-kicker">FreshMart RSMS</p>' +
        '<h1 class="ws-title">' + greet + ', <em>' + esc(name) + '</em></h1>' +
        '<p class="ws-role">' + esc(role) + (role ? ' &middot; ' : '') + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p>' +
        '<ul class="ws-steps">' + STEPS.map((t, i) => '<li style="animation-delay:' + (0.7 + i * 0.6) + 's"><b></b>' + t + '</li>').join('') + '</ul>' +
        '<div class="ws-bar"><i></i></div>' +
        '<button class="ws-skip" type="button">Skip &rarr;</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    timer = setTimeout(close, 3600);
  }

  const original = window.startSession;
  if (typeof original === 'function') {
    window.startSession = function (showWelcome) {
      const r = original.apply(this, arguments);
      if (showWelcome) show();
      return r;
    };
  }
})();
