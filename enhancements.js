/**
 * FreshMart RSMS - enhancements.js
 * Loaded after app.js. Adds the version 2 features without touching the original code:
 *  1. Input cleaning (stops HTML/script text being stored)       8. WhatsApp bill sharing
 *  2. Login lockout after 3 wrong passwords                       9. Barcode scan with the phone/laptop camera
 *  3. Light / dark theme                                         10. Keyboard shortcuts (F2, F9, Ctrl+K)
 *  4. Quick search palette (Ctrl+K)                              11. Sample sales history generator
 *  5. Running-out-soon prediction                                12. Installable app + offline support (PWA)
 *  6. Near-expiry markdown suggestions
 *  7. Day-end closing report, ABC analysis
 */
(function () {
  'use strict';

  const db = () => window.rsmsDB;
  const el = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ } }
  };
  const inr = (v) => (db().getSettings().currency || '\u20B9') + (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const toTime = (str) => new Date(String(str).replace(' ', 'T')).getTime();
  const DAY = 86400000;

  // Wraps one of app.js's global functions so extra code runs after it
  function hook(name, after) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      const result = original.apply(this, args);
      try { after.apply(this, args); } catch (e) { console.error('[enhancements]', name, e); }
      return result;
    };
  }

  /* ================= 1. INPUT CLEANING ================= */
  // Removes < and > from everything that gets saved, so a name like <img onerror=...> can never run as code.
  function clean(value, key) {
    if (key === 'password' || key === 'oldPassword' || key === 'newPassword') return value;
    if (typeof value === 'string') return value.replace(/[<>]/g, '');
    if (Array.isArray(value)) return value.map((v) => clean(v));
    if (value && typeof value === 'object') {
      const out = {};
      Object.keys(value).forEach((k) => { out[k] = clean(value[k], k); });
      return out;
    }
    return value;
  }
  ['addProduct', 'updateProduct', 'addCustomer', 'updateCustomer', 'addSupplier', 'updateSupplier',
    'addCategory', 'updateCategory', 'addUser', 'registerUser', 'updateSettings', 'holdBill',
    'createPurchaseOrder', 'receiveStock', 'adjustStock', 'processSale', 'returnItems', 'voidSale',
    'receiveCustomerPayment', 'applyStockCount'].forEach((name) => {
    const original = db()[name];
    if (typeof original !== 'function') return;
    db()[name] = function (...args) { return original.apply(this, args.map((a) => clean(a))); };
  });
  (function () {
    const original = db().importBackup;
    if (typeof original !== 'function') return;
    db().importBackup = function (jsonString) {
      try { return original.call(this, JSON.stringify(clean(JSON.parse(jsonString)))); } catch (e) { return original.call(this, jsonString); }
    };
  })();

  /* ================= 2. LOGIN LOCKOUT ================= */
  const MAX_TRIES = 3;
  const LOCK_SECONDS = 60;
  const originalHandleLogin = window.handleLogin;
  window.handleLogin = function () {
    const userBox = el('loginUsername');
    const err = el('loginError');
    const name = ((userBox && userBox.value) || '').trim().toLowerCase();
    const records = store.get('rsms_login_guard', {});
    const rec = records[name];

    if (name && rec && rec.until && rec.until > Date.now()) {
      const left = Math.ceil((rec.until - Date.now()) / 1000);
      err.style.display = 'block';
      err.textContent = `Too many wrong passwords. Try again in ${left} second(s).`;
      return;
    }

    originalHandleLogin();
    if (!name) return;

    if (state.currentUser) {
      if (records[name]) { delete records[name]; store.set('rsms_login_guard', records); }
      return;
    }
    if (err && err.style.display !== 'none' && /Invalid password/i.test(err.textContent)) {
      const entry = records[name] && !(records[name].until && records[name].until <= Date.now()) ? records[name] : { tries: 0 };
      entry.tries = (entry.tries || 0) + 1;
      if (entry.tries >= MAX_TRIES) {
        records[name] = { tries: 0, until: Date.now() + LOCK_SECONDS * 1000 };
        err.textContent = `Too many wrong passwords. This account is locked for ${LOCK_SECONDS} seconds.`;
        try { db().actor = 'Login screen'; db().logActivity('Login locked', `${name} entered a wrong password ${MAX_TRIES} times`); } catch (e) { /* ignore */ }
      } else {
        records[name] = entry;
        err.textContent = `Invalid password. ${MAX_TRIES - entry.tries} attempt(s) left.`;
      }
      store.set('rsms_login_guard', records);
    }
  };

  /* ================= 3. THEME ================= */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    store.set('rsms_theme', theme);
    document.querySelectorAll('.theme-toggle i').forEach((i) => { i.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#16a34a');
  }
  window.toggleTheme = function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };
  applyTheme(store.get('rsms_theme', (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'));

  /* ================= 4. NEW PAGE: DAY-END CLOSING (permissions and titles) ================= */
  ROLE_PERMISSIONS.admin.push('dayend');
  ROLE_PERMISSIONS.manager.push('dayend');
  const originalTitle = window.getViewIconAndTitle;
  window.getViewIconAndTitle = (v) => v === 'dayend' ? '<i class="fas fa-calculator text-primary"></i> Day-End Closing Report' : originalTitle(v);
  const originalViewName = window.formatViewName;
  window.formatViewName = (v) => v === 'dayend' ? 'Day-End Closing' : originalViewName(v);
  (function () {
    const originalRenderView = window.renderView;
    window.renderView = function (viewId) {
      if (viewId === 'dayend') { renderDayEnd(); return; }
      return originalRenderView(viewId);
    };
  })();

  /* ================= 5. RUNNING-OUT-SOON PREDICTION ================= */
  const PREDICT_DAYS = 14;
  function predictionRows() {
    const since = Date.now() - PREDICT_DAYS * DAY;
    const sold = {};
    db().getSales().forEach((s) => {
      if (s.status === 'Cancelled' || toTime(s.date) < since) return;
      s.items.forEach((i) => { sold[i.productId] = (sold[i.productId] || 0) + (i.quantity - (i.returnedQty || 0)); });
    });
    const rows = [];
    db().getProducts().forEach((p) => {
      const perDay = (sold[p.productId] || 0) / PREDICT_DAYS;
      if (perDay <= 0) return;
      const daysLeft = p.stockQuantity / perDay;
      if (daysLeft > 7) return;
      rows.push({ p, perDay, daysLeft, reorder: Math.max(Math.ceil(perDay * PREDICT_DAYS - p.stockQuantity), p.minimumLevel || 1) });
    });
    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  }
  function predictionCard(limit, id) {
    const rows = predictionRows().slice(0, limit);
    const body = rows.length ? `
      <div class="table-responsive"><table class="custom-table">
        <thead><tr><th>Product</th><th>In stock</th><th>Sells per day</th><th>Will last</th><th>Suggested reorder</th></tr></thead>
        <tbody>${rows.map((r) => {
          const tag = r.p.stockQuantity === 0 ? ['Out of stock', 'out'] : r.daysLeft < 2 ? [`${Math.max(1, Math.floor(r.daysLeft))} day`, 'out'] : r.daysLeft < 5 ? [`${Math.floor(r.daysLeft)} days`, 'low'] : [`${Math.floor(r.daysLeft)} days`, 'in'];
          return `<tr><td><strong>${esc(r.p.name)}</strong></td><td>${r.p.stockQuantity}</td><td>${r.perDay.toFixed(1)}</td>
            <td><span class="enh-badge enh-badge-${tag[1]}">${tag[0]}</span></td><td>${r.reorder} units</td></tr>`;
        }).join('')}</tbody></table></div>` :
      '<p class="enh-empty">Nothing is expected to run out in the next 7 days at the current selling speed.</p>';
    return `<div class="table-card enh-card" id="${id}">
      <div class="table-header"><h2><i class="fas fa-hourglass-half text-warning"></i> Running out soon <small>based on the last ${PREDICT_DAYS} days of sales</small></h2></div>${body}</div>`;
  }
  hook('renderDashboard', () => {
    const grid = document.querySelector('#view-dashboard .stats-grid');
    if (!grid || !predictionRows().length) return;
    grid.insertAdjacentHTML('afterend', predictionCard(5, 'dashPredictCard'));
  });
  hook('renderInventoryView', () => {
    const view = el('view-inventory');
    if (view) view.insertAdjacentHTML('beforeend', predictionCard(50, 'invPredictCard'));
  });

  /* ================= 6. NEAR-EXPIRY MARKDOWN SUGGESTIONS ================= */
  hook('renderStockReportsView', () => {
    const view = el('view-stockreports');
    if (!view) return;
    const items = db().getExpiringProducts(7).filter((p) => !p.isExpired && p.stockQuantity > 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
    const rows = items.map((p) => {
      const pct = p.daysRemaining <= 2 ? 30 : p.daysRemaining <= 4 ? 20 : 10;
      const floor = p.costPrice || 0;
      const suggested = Math.max(Math.round(p.price * (1 - pct / 100) * 100) / 100, floor);
      const atCost = suggested === floor && floor > 0;
      return `<tr><td><strong>${esc(p.name)}</strong></td><td>${p.stockQuantity}</td>
        <td>${p.daysRemaining <= 0 ? 'Today' : p.daysRemaining + ' day(s)'}</td><td>${inr(p.price)}</td>
        <td><strong>${inr(suggested)}</strong> <span class="enh-muted">(${pct}% off${atCost ? ', kept at cost' : ''})</span></td>
        <td>${inr(p.stockQuantity * p.price)}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${p.productId})">Change price</button></td></tr>`;
    }).join('');
    view.insertAdjacentHTML('beforeend', `<div class="table-card enh-card" id="markdownCard">
      <div class="table-header"><h2><i class="fas fa-tags text-warning"></i> Sell-fast suggestions <small>items expiring within 7 days</small></h2></div>
      ${items.length ? `<div class="table-responsive"><table class="custom-table"><thead><tr><th>Product</th><th>In stock</th><th>Expires in</th><th>Price now</th><th>Suggested price</th><th>Stock value</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="enh-note">These are suggestions only. The suggested price never goes below the cost price.</p>` : '<p class="enh-empty">No product with stock is expiring in the next 7 days.</p>'}
    </div>`);
  });

  /* ================= 7a. DAY-END CLOSING REPORT ================= */
  let dayEndDate = todayStr();
  let dayEndMetrics = null;
  const MODES = ['Cash', 'UPI', 'Card', 'Credit'];

  function dayMetrics(day) {
    const sales = db().getSales();
    const dayOf = (s) => String(s).slice(0, 10);
    const bills = sales.filter((s) => dayOf(s.date) === day && s.status !== 'Cancelled');
    const byMode = {}; const refundByMode = {};
    MODES.forEach((m) => { byMode[m] = { bills: 0, amount: 0 }; refundByMode[m] = 0; });
    let gross = 0;
    bills.forEach((s) => {
      const mode = byMode[s.paymentMode] ? s.paymentMode : 'Cash';
      byMode[mode].bills += 1; byMode[mode].amount += s.totalAmount; gross += s.totalAmount;
    });
    let refundTotal = 0; let refundCount = 0; let cashPaidOut = 0;
    sales.forEach((s) => (s.returns || []).forEach((r) => {
      if (dayOf(r.date) !== day) return;
      refundTotal += r.refundAmount; refundCount += 1;
      const mode = refundByMode[s.paymentMode] !== undefined ? s.paymentMode : 'Cash';
      refundByMode[mode] += r.refundAmount;
      if (s.paymentMode === 'Cash' || s.paymentMode === 'Credit') cashPaidOut += (r.cashRefund || 0);
    }));
    const payments = (db().data.customerPayments || []).filter((p) => dayOf(p.date) === day);
    const collected = {}; MODES.forEach((m) => { collected[m] = 0; });
    payments.forEach((p) => { collected[collected[p.mode] !== undefined ? p.mode : 'Cash'] += p.amount; });
    const cancelled = sales.filter((s) => dayOf(s.date) === day && s.status === 'Cancelled').length;
    return {
      day, billCount: bills.length, gross, refundTotal, refundCount, net: gross - refundTotal,
      byMode, refundByMode, collected, cashPaidOut, cancelled,
      cashSales: byMode.Cash.amount
    };
  }

  function renderDayEnd() {
    const view = el('view-dayend');
    if (!view) return;
    const m = dayEndMetrics = dayMetrics(dayEndDate);
    const draft = store.get('rsms_dayend_' + dayEndDate, { opening: '', counted: '' });
    const label = { Cash: 'Cash', UPI: 'UPI', Card: 'Card', Credit: 'Pay later (not collected)' };
    const statCard = (title, value, note, icon, color) => `<div class="stat-card"><div class="stat-content"><h3>${title}</h3><div class="stat-number">${value}</div><div class="stat-trend">${note}</div></div><div class="stat-icon ${color}"><i class="fas ${icon}"></i></div></div>`;
    const history = store.get('rsms_dayend_log', []).slice(0, 7);

    view.innerHTML = `
      <div class="enh-toolbar">
        <label for="deDate"><strong>Closing date</strong></label>
        <input type="date" id="deDate" class="form-control" max="${todayStr()}" value="${dayEndDate}" onchange="enhDayEndSetDate(this.value)">
        <button class="btn btn-secondary" onclick="enhDayEndPrint()"><i class="fas fa-print"></i> Print report</button>
      </div>
      <div class="stats-grid">
        ${statCard('Bills made', m.billCount, m.cancelled ? `${m.cancelled} cancelled bill(s) not counted` : 'No cancelled bills', 'fa-receipt', 'stat-icon-blue')}
        ${statCard('Total sales', inr(m.gross), 'Before refunds', 'fa-cash-register', 'stat-icon-green')}
        ${statCard('Refunds given', inr(m.refundTotal), `${m.refundCount} return(s) today`, 'fa-rotate-left', 'stat-icon-amber')}
        ${statCard('Net sales', inr(m.net), 'Sales minus refunds', 'fa-sack-dollar', 'stat-icon-purple')}
      </div>
      <div class="enh-two-col">
        <div class="table-card">
          <div class="table-header"><h2><i class="fas fa-wallet text-primary"></i> Sales by payment mode</h2></div>
          <div class="table-responsive"><table class="custom-table">
            <thead><tr><th>Mode</th><th>Bills</th><th>Sales</th><th>Refunds</th><th>Net</th></tr></thead>
            <tbody>${MODES.map((k) => `<tr><td><strong>${label[k]}</strong></td><td>${m.byMode[k].bills}</td><td>${inr(m.byMode[k].amount)}</td><td>${inr(m.refundByMode[k])}</td><td><strong>${inr(m.byMode[k].amount - m.refundByMode[k])}</strong></td></tr>`).join('')}</tbody>
          </table></div>
          <p class="enh-note">Customer dues collected today: Cash ${inr(m.collected.Cash)}, UPI ${inr(m.collected.UPI)}, Card ${inr(m.collected.Card)}.</p>
        </div>
        <div class="table-card" id="cashDrawerCard">
          <div class="table-header"><h2><i class="fas fa-cash-register text-success"></i> Cash drawer check</h2></div>
          <div class="enh-drawer">
            <div class="enh-row"><span>Opening cash in drawer</span><input type="number" id="deOpening" class="form-control" min="0" step="0.01" placeholder="0.00" value="${draft.opening}" oninput="enhDayEndRecalc()"></div>
            <div class="enh-row"><span>+ Cash sales</span><strong>${inr(m.cashSales)}</strong></div>
            <div class="enh-row"><span>+ Dues collected in cash</span><strong>${inr(m.collected.Cash)}</strong></div>
            <div class="enh-row"><span>- Cash refunds paid out</span><strong>${inr(m.cashPaidOut)}</strong></div>
            <div class="enh-row enh-total"><span>Cash that should be in the drawer</span><strong id="deExpected">${inr(0)}</strong></div>
            <div class="enh-row"><span>Cash actually counted</span><input type="number" id="deCounted" class="form-control" min="0" step="0.01" placeholder="Enter counted cash" value="${draft.counted}" oninput="enhDayEndRecalc()"></div>
            <div class="enh-row enh-total"><span>Difference</span><strong id="deDiff">-</strong></div>
            <button class="btn btn-primary btn-full" onclick="enhDayEndSave()"><i class="fas fa-lock"></i> Save closing record</button>
          </div>
        </div>
      </div>
      <div class="table-card enh-card">
        <div class="table-header"><h2><i class="fas fa-clock-rotate-left text-secondary"></i> Recent closing records</h2></div>
        ${history.length ? `<div class="table-responsive"><table class="custom-table"><thead><tr><th>Date</th><th>Closed by</th><th>Net sales</th><th>Expected cash</th><th>Counted</th><th>Difference</th></tr></thead><tbody>
          ${history.map((h) => `<tr><td><strong>${esc(h.date)}</strong></td><td>${esc(h.by)}</td><td>${inr(h.net)}</td><td>${inr(h.expected)}</td><td>${inr(h.counted)}</td><td><span class="enh-badge enh-badge-${Math.abs(h.diff) < 0.5 ? 'in' : h.diff < 0 ? 'out' : 'low'}">${Math.abs(h.diff) < 0.5 ? 'Matched' : (h.diff < 0 ? 'Short ' : 'Excess ') + inr(Math.abs(h.diff))}</span></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="enh-empty">No closing records saved yet.</p>'}
      </div>`;
    window.enhDayEndRecalc();
  }

  function drawerNumbers() {
    const m = dayEndMetrics;
    const opening = parseFloat((el('deOpening') || {}).value);
    const counted = parseFloat((el('deCounted') || {}).value);
    const expected = (isNaN(opening) ? 0 : opening) + m.cashSales + m.collected.Cash - m.cashPaidOut;
    return { opening: isNaN(opening) ? 0 : opening, counted: isNaN(counted) ? null : counted, expected };
  }
  window.enhDayEndRecalc = function () {
    if (!dayEndMetrics) return;
    const n = drawerNumbers();
    el('deExpected').textContent = inr(n.expected);
    const diffEl = el('deDiff');
    if (n.counted === null) { diffEl.textContent = '-'; diffEl.className = ''; }
    else {
      const diff = Math.round((n.counted - n.expected) * 100) / 100;
      diffEl.textContent = Math.abs(diff) < 0.5 ? 'Matches' : (diff < 0 ? 'Short by ' : 'Excess of ') + inr(Math.abs(diff));
      diffEl.className = Math.abs(diff) < 0.5 ? 'enh-good' : diff < 0 ? 'enh-bad' : 'enh-warn';
    }
    store.set('rsms_dayend_' + dayEndDate, { opening: (el('deOpening') || {}).value || '', counted: (el('deCounted') || {}).value || '' });
  };
  window.enhDayEndSetDate = function (value) { if (value) { dayEndDate = value; renderDayEnd(); } };
  window.enhDayEndSave = function () {
    const n = drawerNumbers();
    if (n.counted === null) { showToast('Enter the cash you counted before saving.', 'warning'); return; }
    const log = store.get('rsms_dayend_log', []).filter((h) => h.date !== dayEndDate);
    const diff = Math.round((n.counted - n.expected) * 100) / 100;
    log.unshift({ date: dayEndDate, by: state.currentUser.name, net: dayEndMetrics.net, expected: n.expected, counted: n.counted, diff, savedAt: new Date().toISOString() });
    store.set('rsms_dayend_log', log.slice(0, 60));
    try { db().actor = state.currentUser.name; db().logActivity('Day closed', `${dayEndDate}: net ${dayEndMetrics.net.toFixed(2)}, cash difference ${diff.toFixed(2)}`); } catch (e) { /* ignore */ }
    showToast('Closing record saved.', 'success');
    renderDayEnd();
  };
  window.enhDayEndPrint = function () {
    const m = dayEndMetrics; const n = drawerNumbers();
    const rows = MODES.map((k) => `<tr><td>${k === 'Credit' ? 'Pay later' : k}</td><td>${m.byMode[k].bills}</td><td>${inr(m.byMode[k].amount)}</td><td>${inr(m.refundByMode[k])}</td><td>${inr(m.byMode[k].amount - m.refundByMode[k])}</td></tr>`).join('');
    printHTML(`Day-End Closing Report - ${dayEndDate}`, `
      <table class="print-table"><thead><tr><th>Mode</th><th>Bills</th><th>Sales</th><th>Refunds</th><th>Net</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td><strong>Total</strong></td><td>${m.billCount}</td><td>${inr(m.gross)}</td><td>${inr(m.refundTotal)}</td><td><strong>${inr(m.net)}</strong></td></tr></tfoot></table>
      <h3 style="margin:16px 0 6px;">Cash drawer</h3>
      <table class="print-table"><tbody>
        <tr><td>Opening cash</td><td>${inr(n.opening)}</td></tr>
        <tr><td>Cash sales</td><td>${inr(m.cashSales)}</td></tr>
        <tr><td>Dues collected in cash</td><td>${inr(m.collected.Cash)}</td></tr>
        <tr><td>Cash refunds paid out</td><td>${inr(m.cashPaidOut)}</td></tr>
        <tr><td><strong>Should be in drawer</strong></td><td><strong>${inr(n.expected)}</strong></td></tr>
        <tr><td>Counted</td><td>${n.counted === null ? 'Not entered' : inr(n.counted)}</td></tr>
        <tr><td><strong>Difference</strong></td><td><strong>${n.counted === null ? '-' : inr(n.counted - n.expected)}</strong></td></tr>
      </tbody></table>
      <p style="margin-top:28px;">Closed by: ${esc(state.currentUser.name)} &nbsp;&nbsp;&nbsp; Signature: ____________________</p>`);
  };

  /* ================= 7b. ABC ANALYSIS (inside Reports) ================= */
  hook('renderReportsView', () => {
    const view = el('view-reports');
    if (!view) return;
    const revenue = {}; const names = {};
    db().getSales().forEach((s) => {
      if (s.status === 'Cancelled') return;
      s.items.forEach((i) => {
        const keptQty = i.quantity - (i.returnedQty || 0);
        if (keptQty <= 0) return;
        revenue[i.productId] = (revenue[i.productId] || 0) + i.price * keptQty;
        names[i.productId] = i.productName;
      });
    });
    const list = Object.keys(revenue).map((id) => ({ id, name: names[id], revenue: revenue[id] })).sort((a, b) => b.revenue - a.revenue);
    const total = list.reduce((t, r) => t + r.revenue, 0);
    let before = 0;
    list.forEach((r) => { const share = before / total * 100; r.cls = share < 80 ? 'A' : share < 95 ? 'B' : 'C'; before += r.revenue; r.share = r.revenue / total * 100; });
    const sum = (c) => ({ n: list.filter((r) => r.cls === c).length, pct: list.filter((r) => r.cls === c).reduce((t, r) => t + r.share, 0) });
    const tiles = ['A', 'B', 'C'].map((c) => { const s = sum(c); return `<div class="abc-tile abc-${c}"><div class="abc-letter">${c}</div><div><strong>${s.n} product(s)</strong><div class="enh-muted">${s.pct.toFixed(0)}% of sales</div></div></div>`; }).join('');
    const hint = { A: 'Always keep in stock', B: 'Reorder regularly', C: 'Order only when needed' };
    view.insertAdjacentHTML('beforeend', `<div class="table-card enh-card" id="abcCard">
      <div class="table-header"><h2><i class="fas fa-layer-group text-primary"></i> ABC analysis <small>which products earn the most</small></h2></div>
      ${list.length ? `<div class="abc-tiles">${tiles}</div>
      <div class="table-responsive"><table class="custom-table"><thead><tr><th>#</th><th>Product</th><th>Sales</th><th>Share</th><th>Class</th><th>What to do</th></tr></thead><tbody>
        ${list.slice(0, 10).map((r, i) => `<tr><td>${i + 1}</td><td><strong>${esc(r.name)}</strong></td><td>${inr(r.revenue)}</td><td>${r.share.toFixed(1)}%</td><td><span class="abc-pill abc-${r.cls}">${r.cls}</span></td><td>${hint[r.cls]}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="enh-note">A products give about 80% of the sales, B the next 15%, and C the last 5%. Based on all saved bills (cancelled bills and returned items are left out). Top 10 shown.</p>` : '<p class="enh-empty">No sales yet. Make some bills or load the sample sales from Settings.</p>'}
    </div>`);
  });

  /* ================= 8. WHATSAPP BILL SHARING ================= */
  function billText(sale) {
    const s = db().getSettings();
    const lines = [`*${s.storeName}*`, `Bill No: ${sale.billNo}`, `Date: ${sale.date}`, `Customer: ${sale.customerName}`, '------------------------------'];
    sale.items.forEach((i) => lines.push(`${i.productName} x${i.quantity} = ${inr(i.itemTotal)}`));
    lines.push('------------------------------', `Subtotal: ${inr(sale.subtotal)}`, `Tax (${sale.taxRate}%): ${inr(sale.taxAmount)}`);
    if (sale.discountAmount) lines.push(`Discount: -${inr(sale.discountAmount)}`);
    lines.push(`*Total: ${inr(sale.totalAmount)}*`, `Paid by: ${sale.paymentMode}`, '', 'Thank you for shopping with us!');
    return lines.join('\n');
  }
  window.enhShareBill = function (billNo) {
    const sale = db().getSaleByBillNo(billNo);
    if (!sale) return;
    const customer = db().getCustomerById(sale.customerId);
    let digits = String((customer && customer.phone) || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    const usable = digits.length === 10 && !/^(\d)\1+$/.test(digits);
    const url = `https://wa.me/${usable ? '91' + digits : ''}?text=${encodeURIComponent(billText(sale))}`;
    window.open(url, '_blank', 'noopener');
  };
  hook('viewReceipt', (billNo) => {
    const footer = document.querySelector('#receiptModal .modal-footer');
    if (!footer || !db().getSaleByBillNo(billNo)) return;
    let btn = el('waShareBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'waShareBtn';
      btn.className = 'btn btn-whatsapp';
      btn.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp';
      footer.insertBefore(btn, footer.lastElementChild);
    }
    btn.onclick = () => window.enhShareBill(billNo);
  });

  /* ================= 9. CAMERA BARCODE SCANNER + POS HINTS ================= */
  let scanStream = null; let scanTimer = null;
  window.enhCloseScanner = function () {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    if (scanStream) { scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; }
    const modal = el('scanModal'); if (modal) modal.remove();
  };
  async function openScanner() {
    if (!('BarcodeDetector' in window)) {
      showToast('Camera scanning needs a browser that supports it (Chrome on Android or computer). You can still type the barcode, or use a USB scanner, in the search box.', 'warning');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showToast('This browser cannot open the camera.', 'error'); return; }
    window.enhCloseScanner();
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay open" id="scanModal"><div class="modal-box" style="max-width:480px;">
      <div class="modal-header"><h3><i class="fas fa-barcode text-primary"></i> Scan barcode</h3><button class="modal-close-btn" onclick="enhCloseScanner()">&times;</button></div>
      <div class="modal-body"><video id="scanVideo" playsinline muted autoplay></video><p class="enh-hint" id="scanStatus">Point the camera at a product barcode. Each product found is added to the bill.</p></div></div></div>`);
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const video = el('scanVideo');
      video.srcObject = scanStream;
      await video.play();
      let detector;
      try { detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] }); } catch (e) { detector = new BarcodeDetector(); }
      let lastCode = ''; let lastTime = 0;
      scanTimer = setInterval(async () => {
        if (!el('scanVideo')) return;
        try {
          const found = await detector.detect(video);
          if (!found.length) return;
          const code = found[0].rawValue;
          if (code === lastCode && Date.now() - lastTime < 2500) return;
          lastCode = code; lastTime = Date.now();
          const product = db().getProductByBarcode(code);
          const status = el('scanStatus');
          if (product) { addToCart(product.productId); if (status) status.textContent = `Added: ${product.name}`; }
          else if (status) status.textContent = `No product has the barcode ${code}.`;
        } catch (e) { /* frame not ready */ }
      }, 300);
    } catch (e) {
      window.enhCloseScanner();
      showToast('Camera could not be opened. Please allow camera permission and try again.', 'error');
    }
  }
  hook('renderPOS', () => {
    const bar = document.querySelector('#view-pos .pos-search-bar');
    if (bar && !el('posScanBtn')) {
      const btn = document.createElement('button');
      btn.id = 'posScanBtn'; btn.className = 'btn btn-secondary btn-sm'; btn.title = 'Scan a barcode with the camera';
      btn.innerHTML = '<i class="fas fa-barcode"></i> Scan';
      btn.onclick = openScanner;
      bar.insertBefore(btn, bar.lastElementChild);
      bar.insertAdjacentHTML('afterend', '<div class="enh-hint enh-shortcuts"><kbd>F2</kbd> search &nbsp; <kbd>F9</kbd> pay &nbsp; <kbd>Enter</kbd> add first match &nbsp; <kbd>Ctrl</kbd>+<kbd>K</kbd> quick search</div>');
    }
  });

  /* ================= 10. KEYBOARD SHORTCUTS ================= */
  document.addEventListener('keydown', (e) => {
    if (!state.currentUser) return;
    const allowed = ROLE_PERMISSIONS[state.currentUser.role] || [];
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); window.openPalette(); return; }
    if (e.key === 'F2' && allowed.includes('pos')) {
      e.preventDefault(); navigateTo('pos');
      setTimeout(() => { const box = el('posSearchInput'); if (box) box.focus(); }, 60);
    }
    if (e.key === 'F9' && state.activeView === 'pos') {
      e.preventDefault();
      if (state.pos.cart.length) openPaymentModal(); else showToast('Add items to the bill first.', 'warning');
    }
  });

  /* ================= 11. QUICK SEARCH PALETTE ================= */
  const PAGES = {
    dashboard: ['Dashboard', 'fa-chart-pie'], pos: ['POS Billing', 'fa-cash-register'], sales: ['Sales History', 'fa-receipt'],
    dayend: ['Day-End Closing', 'fa-calculator'], products: ['Products & Catalog', 'fa-boxes'], categories: ['Categories', 'fa-tags'],
    inventory: ['Stock Alerts', 'fa-warehouse'], stockcount: ['Stock Count Check', 'fa-clipboard-check'],
    stockreports: ['Stock & Expiry Reports', 'fa-file-lines'], purchases: ['Stock In / Purchases', 'fa-truck-loading'],
    orders: ['Purchase Orders', 'fa-file-invoice'], customers: ['Customers', 'fa-users'], suppliers: ['Suppliers', 'fa-truck'],
    reports: ['Reports & Analytics', 'fa-file-invoice-dollar'], activity: ['Activity Log', 'fa-clock-rotate-left'],
    users: ['User Accounts', 'fa-user-shield'], settings: ['Settings & Backup', 'fa-cog']
  };
  let paletteItems = []; let paletteIndex = 0;

  function buildPalette() {
    if (el('paletteModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay palette-overlay" id="paletteModal">
      <div class="palette-box" role="dialog" aria-label="Quick search">
        <div class="palette-input-wrap"><i class="fas fa-search"></i><input id="paletteInput" type="text" autocomplete="off" placeholder="Search pages, products, customers or bill numbers"></div>
        <div class="palette-list" id="paletteList" role="listbox"></div>
        <div class="palette-foot"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
      </div></div>`);
    const input = el('paletteInput');
    input.addEventListener('input', () => { paletteIndex = 0; renderPalette(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(paletteIndex + 1, paletteItems.length - 1); highlightPalette(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(paletteIndex - 1, 0); highlightPalette(); }
      else if (e.key === 'Enter') { e.preventDefault(); runPaletteItem(paletteIndex); }
      else if (e.key === 'Escape') { window.closePalette(); }
    });
    el('paletteModal').addEventListener('mousedown', (e) => { if (e.target.id === 'paletteModal') window.closePalette(); });
    el('paletteList').addEventListener('click', (e) => {
      const row = e.target.closest('[data-i]'); if (row) runPaletteItem(parseInt(row.getAttribute('data-i'), 10));
    });
  }
  function collectPaletteItems(q) {
    const role = state.currentUser.role;
    const allowed = ROLE_PERMISSIONS[role] || [];
    const query = q.trim().toLowerCase();
    const match = (text) => !query || String(text).toLowerCase().includes(query);
    const items = [];
    allowed.forEach((v) => { if (PAGES[v] && match(PAGES[v][0])) items.push({ group: 'Pages', icon: PAGES[v][1], title: PAGES[v][0], sub: 'Open page', run: () => navigateTo(v) }); });
    const actions = [];
    if (allowed.includes('pos')) actions.push({ icon: 'fa-plus-circle', title: 'Create new bill', run: () => navigateTo('pos') });
    if (allowed.includes('products')) actions.push({ icon: 'fa-box', title: 'Add new product', run: () => openAddProductModal() });
    if (allowed.includes('purchases')) actions.push({ icon: 'fa-truck-loading', title: 'Receive stock from supplier', run: () => openReceiveStockModal() });
    actions.push({ icon: 'fa-key', title: 'Change my password', run: () => openChangePasswordModal() });
    actions.push({ icon: 'fa-circle-half-stroke', title: 'Switch light / dark theme', run: () => window.toggleTheme() });
    actions.push({ icon: 'fa-right-from-bracket', title: 'Sign out', run: () => logout() });
    actions.forEach((a) => { if (match(a.title)) items.push({ group: 'Actions', icon: a.icon, title: a.title, sub: 'Action', run: a.run }); });
    if (query) {
      if (allowed.includes('pos') || allowed.includes('products')) {
        db().getProducts().filter((p) => match(p.name) || match(p.barcode)).slice(0, 6).forEach((p) => items.push({
          group: 'Products', icon: 'fa-box', title: p.name,
          sub: `${inr(p.price)} \u00B7 ${p.stockQuantity} in stock \u00B7 ${allowed.includes('pos') ? 'Add to bill' : 'Edit product'}`,
          run: () => { if (allowed.includes('pos')) { navigateTo('pos'); addToCart(p.productId); } else openEditProductModal(p.productId); }
        }));
      }
      if (allowed.includes('customers')) {
        db().getCustomers().filter((c) => c.customerId !== 1 && (match(c.name) || match(c.phone))).slice(0, 4).forEach((c) => items.push({
          group: 'Customers', icon: 'fa-user', title: c.name, sub: `${c.phone || ''} \u00B7 View purchase history`, run: () => { navigateTo('customers'); showCustomerHistory(c.customerId); }
        }));
      }
      if (allowed.includes('sales')) {
        db().getSales().filter((s) => match(s.billNo) || match(s.customerName)).slice(0, 5).forEach((s) => items.push({
          group: 'Bills', icon: 'fa-receipt', title: s.billNo, sub: `${s.customerName} \u00B7 ${inr(s.totalAmount)} \u00B7 ${s.date.slice(0, 10)}`, run: () => viewReceipt(s.billNo)
        }));
      }
    }
    return items.slice(0, 14);
  }
  function renderPalette() {
    paletteItems = collectPaletteItems(el('paletteInput').value);
    const list = el('paletteList');
    if (!paletteItems.length) { list.innerHTML = '<div class="palette-empty">Nothing found. Try a product name, customer name or bill number.</div>'; return; }
    let group = ''; let html = '';
    paletteItems.forEach((it, i) => {
      if (it.group !== group) { group = it.group; html += `<div class="palette-group">${group}</div>`; }
      html += `<div class="palette-item" role="option" data-i="${i}"><i class="fas ${it.icon}"></i><div><div class="palette-title">${esc(it.title)}</div><div class="palette-sub">${esc(it.sub)}</div></div></div>`;
    });
    list.innerHTML = html;
    highlightPalette();
  }
  function highlightPalette() {
    document.querySelectorAll('#paletteList .palette-item').forEach((row) => {
      const on = parseInt(row.getAttribute('data-i'), 10) === paletteIndex;
      row.classList.toggle('active', on);
      if (on) row.scrollIntoView({ block: 'nearest' });
    });
  }
  function runPaletteItem(i) {
    const item = paletteItems[i]; if (!item) return;
    window.closePalette();
    setTimeout(() => { try { item.run(); } catch (e) { console.error(e); } }, 30);
  }
  window.openPalette = function () {
    if (!state.currentUser) return;
    buildPalette();
    el('paletteModal').classList.add('open');
    const input = el('paletteInput'); input.value = ''; paletteIndex = 0;
    renderPalette();
    input.focus();
  };
  window.closePalette = function () { const m = el('paletteModal'); if (m) m.classList.remove('open'); };

  /* ================= 12. SAMPLE SALES HISTORY (for demonstrations) ================= */
  function seededRandom(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function demoCount() { return db().getSales().filter((s) => s.demo).length; }
  window.enhLoadDemo = function () {
    if (demoCount()) { showToast('Sample sales are already loaded.', 'info'); return; }
    const rand = seededRandom(20261121);
    const products = db().getProducts().filter((p) => p.price > 0);
    const registered = db().getCustomers().filter((c) => c.customerId !== 1);
    const walkIn = db().getCustomerById(1) || { customerId: 1, name: 'Walk-in Customer' };
    const staff = db().getUsers().filter((u) => u.role === 'cashier' || u.role === 'manager');
    const taxRate = db().getSettings().taxRate;
    const weights = products.map((p) => 100 / Math.sqrt(p.price));
    const weightTotal = weights.reduce((a, b) => a + b, 0);
    const pick = () => { let r = rand() * weightTotal; for (let i = 0; i < products.length; i++) { r -= weights[i]; if (r <= 0) return products[i]; } return products[0]; };
    const now = new Date();
    let nextId = db().getSales().reduce((m, s) => Math.max(m, s.saleId), 1000) + 1;
    let counter = 1; const made = [];

    for (let ago = 30; ago >= 0; ago--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      let count = Math.round((6 + rand() * 6) * (weekend ? 1.4 : 1));
      const lastMinute = ago === 0 ? now.getHours() * 60 + now.getMinutes() : 21 * 60;
      if (lastMinute <= 9 * 60) count = 0;
      const minutes = Array.from({ length: count }, () => 9 * 60 + Math.floor(rand() * (lastMinute - 9 * 60))).sort((a, b) => a - b);
      minutes.forEach((mins) => {
        const lines = {}; const howMany = 1 + Math.floor(rand() * 4);
        for (let k = 0; k < howMany; k++) { const p = pick(); lines[p.productId] = { productId: p.productId, quantity: (lines[p.productId] ? lines[p.productId].quantity : 0) + 1 + Math.floor(rand() * (p.price < 60 ? 3 : 2)) }; }
        const cartItems = Object.values(lines);
        const subtotal = db().calculateBill(cartItems, 0, taxRate).subtotal;
        const discount = rand() < 0.08 ? Math.round(subtotal * 0.05) : 0;
        const calc = db().calculateBill(cartItems, discount, taxRate);
        const r = rand();
        const mode = r < 0.38 ? 'Cash' : r < 0.74 ? 'UPI' : 'Card';
        const customer = registered.length && rand() < 0.3 ? registered[Math.floor(rand() * registered.length)] : walkIn;
        const who = staff.length ? staff[Math.floor(rand() * staff.length)] : { userId: 3, name: 'Cashier' };
        made.push({
          saleId: nextId++, billNo: `DEMO-${String(counter++).padStart(4, '0')}`, customerId: customer.customerId, customerName: customer.name,
          userId: who.userId, cashierName: who.name,
          date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())} ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00`,
          subtotal: calc.subtotal, taxRate: calc.taxRate, taxAmount: calc.taxAmount, discountAmount: calc.discountAmount, totalAmount: calc.totalAmount,
          paymentMode: mode, items: calc.items, status: 'Completed', amountDue: 0, notes: 'Sample data', demo: true
        });
      });
    }
    db().data.sales = db().data.sales.concat(made).sort((a, b) => b.date.localeCompare(a.date));
    try { db().actor = state.currentUser.name; db().logActivity('Sample sales loaded', `${made.length} sample bills added`); } catch (e) { /* ignore */ }
    db().saveData();
    showToast(`${made.length} sample bills added for the last 30 days.`, 'success');
    renderSettingsView();
  };
  window.enhRemoveDemo = function () {
    const n = demoCount();
    if (!n) { showToast('There are no sample sales to remove.', 'info'); return; }
    if (!confirm(`Remove ${n} sample bills? Your own bills are not touched.`)) return;
    db().data.sales = db().data.sales.filter((s) => !s.demo);
    try { db().actor = state.currentUser.name; db().logActivity('Sample sales removed', `${n} sample bills removed`); } catch (e) { /* ignore */ }
    db().saveData();
    showToast('Sample sales removed.', 'success');
    renderSettingsView();
  };
  hook('renderSettingsView', () => {
    const view = el('view-settings');
    if (!view) return;
    const n = demoCount();
    view.insertAdjacentHTML('beforeend', `<div class="table-card enh-card" id="demoCard">
      <div class="table-header"><h2><i class="fas fa-flask text-primary"></i> Sample sales history <small>for demonstrations</small></h2></div>
      <div class="enh-demo">
        <p>Adds about 30 days of sample bills so the dashboard chart, reports, top products, ABC analysis and stock predictions have data to show. Product stock is not changed, and sample bills are numbered DEMO-xxxx so you can remove them any time.</p>
        <div class="enh-demo-actions">
          <button class="btn btn-primary" onclick="enhLoadDemo()"><i class="fas fa-wand-magic-sparkles"></i> Load 30 days of sample sales</button>
          <button class="btn btn-secondary" onclick="enhRemoveDemo()"><i class="fas fa-trash"></i> Remove sample sales</button>
          <span class="enh-muted">${n ? n + ' sample bills currently loaded' : 'No sample bills loaded'}</span>
        </div>
      </div></div>`);
  });

  /* ================= 12b. REAL UPI QR CODE ================= */
  // The first version showed a drawing of a QR code. This one builds a real code that
  // Google Pay, PhonePe or Paytm can scan, with the exact bill amount filled in.
  window.generateUpiQR = function () {
    const container = el('upiQrCodeContainer');
    if (!container) return;
    const s = db().getSettings();
    const calc = db().calculateBill(state.pos.cart, state.pos.discount, s.taxRate);
    const savedId = String(s.upiId || '').replace(/\s/g, '');
    const upiId = savedId || 'freshmart@upi';
    const bill = `${s.invoicePrefix}${s.nextInvoiceNumber}`;
    const link = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(s.storeName)}&am=${calc.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(bill)}`;
    let svg = '';
    try { const qr = qrcode(0, 'M'); qr.addData(link); qr.make(); svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { svg = ''; }
    container.innerHTML = `<div class="upi-box">
      <div class="upi-qr" id="upiQrImage">${svg || '<p>QR code could not be made.</p>'}</div>
      <div class="upi-amount">${inr(calc.totalAmount)}</div>
      <div class="upi-help">Scan with Google Pay, PhonePe or Paytm</div>
      <div class="upi-id">${esc(upiId)}</div>
      ${savedId ? '' : '<div class="upi-warn">Demo UPI ID. Set the shop\u2019s own UPI ID in Settings to receive real payments.</div>'}
    </div>`;
  };
  window.enhSaveUpi = function () {
    const value = String((el('upiIdInput') || {}).value || '').replace(/\s/g, '');
    if (value && !/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9]{2,}$/.test(value)) { showToast('That does not look like a UPI ID. It should look like shopname@bank.', 'warning'); return; }
    db().updateSettings({ upiId: value });
    showToast(value ? 'UPI ID saved. The payment QR code now uses it.' : 'UPI ID cleared. The demo ID will be used.', 'success');
    renderSettingsView();
  };
  hook('renderSettingsView', () => {
    const view = el('view-settings');
    if (!view) return;
    const saved = String(db().getSettings().upiId || '');
    view.insertAdjacentHTML('beforeend', `<div class="table-card enh-card" id="upiCard">
      <div class="table-header"><h2><i class="fas fa-qrcode text-primary"></i> UPI payments <small>QR code on the payment screen</small></h2></div>
      <div class="enh-demo">
        <p>Enter the shop\u2019s UPI ID. The payment screen then shows a real QR code with the bill amount filled in, and customers can scan it with any UPI app.</p>
        <div class="enh-demo-actions">
          <input type="text" id="upiIdInput" class="form-control" style="max-width:260px;" placeholder="shopname@bank" value="${esc(saved)}" autocomplete="off">
          <button class="btn btn-primary" onclick="enhSaveUpi()"><i class="fas fa-floppy-disk"></i> Save UPI ID</button>
        </div>
      </div></div>`);
  });

  /* ================= 13. INSTALLABLE APP + OFFLINE (PWA) ================= */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ }); });
  }
})();
