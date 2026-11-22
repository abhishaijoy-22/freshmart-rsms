/* FreshMart RSMS - polish.js: small visual extras (count-up numbers, quick cash buttons). No business logic. */
(function () {
  // Count-up on dashboard numbers whenever the dashboard is drawn
  const dash = document.getElementById('view-dashboard');
  if (dash && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    new MutationObserver(() => {
      dash.querySelectorAll('.stat-number').forEach(el => {
        const m = el.textContent.trim().match(/^(\u20B9)?([\d,]+(?:\.\d+)?)$/);
        if (!m) return;
        const end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, pre = m[1] || '';
        if (!end) return;
        const t0 = performance.now(), dur = 900;
        (function tick(now) {
          const p = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
          el.textContent = pre + v.toFixed(dec);
          if (p < 1) requestAnimationFrame(tick); else el.textContent = pre + end.toFixed(dec);
        })(t0);
      });
    }).observe(dash, { childList: true });
  }

  // Quick cash buttons in the payment window
  window.quickCash = function (amount) {
    const input = document.getElementById('cashTenderedInput');
    if (!input) return;
    if (amount === 'exact') {
      const total = parseFloat((document.getElementById('payTotalAmountDisplay').textContent || '').replace(/[^\d.]/g, '')) || 0;
      input.value = Math.ceil(total);
    } else input.value = amount;
    if (typeof calculateCashChange === 'function') calculateCashChange();
  };
})();
