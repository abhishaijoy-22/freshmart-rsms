const { newPage, login, BASE } = require('./harness.js');
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  -> ' + extra : '')); };

(async () => {
  const { browser, ctx, page, errors } = await newPage({
    launch: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    context: { permissions: ['camera'] }
  });
  await page.addInitScript(() => { window.BarcodeDetector = class { constructor() {} async detect() { return [{ rawValue: '890123456001' }]; } }; });
  const URL = BASE;
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'load' });

  // ---- Login lockout ----
  for (let i = 0; i < 3; i++) { await page.fill('#loginUsername', 'cashier'); await page.fill('#loginPassword', 'wrong' + i); await page.click('text=Sign In'); await page.waitForTimeout(150); }
  let msg = await page.textContent('#loginError');
  ok('Lockout: 3rd wrong password locks the account', /locked/i.test(msg), msg);
  await page.fill('#loginUsername', 'cashier'); await page.fill('#loginPassword', 'cashier123'); await page.click('text=Sign In'); await page.waitForTimeout(200);
  msg = await page.textContent('#loginError');
  ok('Lockout: correct password is refused while locked', /Try again in/i.test(msg) && await page.isVisible('#loginScreen'), msg);
  await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('rsms_login_guard')); Object.keys(g).forEach(k => g[k].until = Date.now() - 1000); localStorage.setItem('rsms_login_guard', JSON.stringify(g)); });
  await page.fill('#loginPassword', 'cashier123'); await page.click('text=Sign In'); await page.waitForTimeout(600);
  ok('Lockout: login works again after lock time ends', !(await page.isVisible('#loginScreen')));
  const act = await page.evaluate(() => rsmsDB.getActivityLog().some(a => /Login locked/.test(a.action)));
  ok('Lockout: written to Activity Log', act);

  // ---- Cashier role: no Day-End page ----
  await page.evaluate(() => navigateTo('dayend')); await page.waitForTimeout(200);
  ok('Roles: cashier cannot open Day-End Closing', await page.evaluate(() => state.activeView !== 'dayend'));
  ok('Roles: Day-End hidden in cashier menu', !(await page.isVisible('.nav-link[data-view="dayend"]')));
  await page.click('text=Logout'); await page.waitForTimeout(300);

  // ---- Manager can open Day-End ----
  await login(page, 'manager', 'manager123');
  await page.evaluate(() => navigateTo('dayend')); await page.waitForTimeout(300);
  ok('Roles: manager can open Day-End Closing', await page.evaluate(() => state.activeView === 'dayend'));
  await page.click('text=Logout'); await page.waitForTimeout(300);

  // ---- Admin: sample data ----
  await login(page, 'admin', 'admin123');
  await page.evaluate(() => navigateTo('settings')); await page.waitForTimeout(300);
  ok('Sample data card is shown in Settings', await page.isVisible('#demoCard'));
  await page.evaluate(() => enhLoadDemo()); await page.waitForTimeout(500);
  const demoN = await page.evaluate(() => rsmsDB.getSales().filter(s => s.demo).length);
  ok('Sample data: bills created', demoN > 150, demoN + ' bills');
  const stockBefore = await page.evaluate(() => rsmsDB.getProducts().reduce((t, p) => t + p.stockQuantity, 0));
  ok('Sample data: product stock unchanged (1978 units)', stockBefore === 1978, String(stockBefore));

  // ---- Dashboard ----
  await page.evaluate(() => navigateTo('dashboard')); await page.waitForTimeout(400);
  const predVisible = await page.isVisible('#dashPredictCard');
  ok('Prediction card on dashboard', predVisible);
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });
  const predRows = await page.evaluate(() => document.querySelectorAll('#dashPredictCard tbody tr').length);
  ok('Prediction lists products', predRows > 0, predRows + ' rows');

  await page.evaluate(() => navigateTo('inventory')); await page.waitForTimeout(300);
  ok('Prediction card on Stock Alerts page', await page.isVisible('#invPredictCard'));
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });

  // ---- Expiry markdown ----
  await page.evaluate(() => navigateTo('stockreports')); await page.waitForTimeout(300);
  ok('Near-expiry card on Stock & Expiry page', await page.isVisible('#markdownCard'));
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png', fullPage: false });

  // ---- ABC ----
  await page.evaluate(() => navigateTo('reports')); await page.waitForTimeout(400);
  ok('ABC analysis card in Reports', await page.isVisible('#abcCard'));
  const abc = await page.evaluate(() => [...document.querySelectorAll('#abcCard .abc-tile strong')].map(e => e.textContent));
  ok('ABC tiles show A, B, C counts', abc.length === 3, abc.join(' | '));
  await page.evaluate(() => document.querySelector('#abcCard').scrollIntoView());
  await page.waitForTimeout(200);
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });

  // ---- Day-end ----
  await page.evaluate(() => navigateTo('dayend')); await page.waitForTimeout(400);
  const today = await page.evaluate(() => { const m = rsmsDB.getSales().filter(s => s.date.slice(0,10) === new Date().toISOString().slice(0,10)); return m.length; });
  await page.fill('#deOpening', '2000'); await page.waitForTimeout(100);
  const expectedTxt = await page.textContent('#deExpected');
  const calc = await page.evaluate(() => { const d = new Date(); const p = n => String(n).padStart(2,'0'); const day = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; const cash = rsmsDB.getSales().filter(s => s.date.slice(0,10)===day && s.status!=='Cancelled' && s.paymentMode==='Cash').reduce((t,s)=>t+s.totalAmount,0); return 2000 + cash; });
  const fmt = v => '\u20B9' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  ok('Day-end: expected cash = opening + cash sales', expectedTxt === fmt(calc), `${expectedTxt} vs ${fmt(calc)}`);
  await page.fill('#deCounted', String(calc - 50)); await page.waitForTimeout(100);
  const diffTxt = await page.textContent('#deDiff');
  ok('Day-end: shows shortage when counted is lower', /Short by/.test(diffTxt) && diffTxt.includes('50.00'), diffTxt);
  await page.fill('#deCounted', String(calc)); await page.waitForTimeout(100);
  ok('Day-end: shows Matches when counted equals expected', (await page.textContent('#deDiff')) === 'Matches');
  await page.click('text=Save closing record'); await page.waitForTimeout(400);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rsms_dayend_log') || '[]').length);
  ok('Day-end: closing record saved', saved === 1);
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });

  // ---- Palette ----
  await page.keyboard.press('Control+k'); await page.waitForTimeout(250);
  ok('Palette: opens with Ctrl+K', await page.isVisible('#paletteInput'));
  await page.keyboard.type('milk'); await page.waitForTimeout(250);
  const pal = await page.evaluate(() => [...document.querySelectorAll('#paletteList .palette-title')].map(e => e.textContent));
  ok('Palette: finds product by name', pal.some(t => /Milk/i.test(t)), pal.slice(0, 4).join(', '));
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok('Palette: closes with Esc', !(await page.isVisible('#paletteInput')));
  await page.keyboard.press('Control+k'); await page.keyboard.type('DEMO-0005'); await page.waitForTimeout(250);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  ok('Palette: bill search opens the receipt', await page.isVisible('#receiptModal.open'));

  // ---- WhatsApp ----
  ok('WhatsApp button appears on the bill', await page.isVisible('#waShareBtn'));
  await page.evaluate(() => { window.__opened = null; window.open = (u) => { window.__opened = u; return null; }; });
  await page.click('#waShareBtn');
  const wa = await page.evaluate(() => window.__opened);
  ok('WhatsApp link built with bill text', wa && wa.startsWith('https://wa.me/') && decodeURIComponent(wa).includes('DEMO-0005') && decodeURIComponent(wa).includes('Total'), (wa || '').slice(0, 80));
  await page.evaluate(() => closeModal('receiptModal'));

  // ---- Shortcuts + scanner ----
  await page.keyboard.press('F2'); await page.waitForTimeout(400);
  ok('Shortcut F2 opens POS with search focused', await page.evaluate(() => state.activeView === 'pos' && document.activeElement && document.activeElement.id === 'posSearchInput'));
  await page.keyboard.press('F9'); await page.waitForTimeout(200);
  ok('Shortcut F9 with empty bill warns, no payment window', !(await page.isVisible('#paymentModal.open')));
  await page.click('#posScanBtn'); await page.waitForTimeout(1400);
  const cartNames = await page.evaluate(() => state.pos.cart.length);
  ok('Camera scan adds the scanned product to the bill', cartNames >= 1 && await page.isVisible('#scanModal'), 'cart lines: ' + cartNames);
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });
  await page.evaluate(() => enhCloseScanner());
  await page.keyboard.press('F9'); await page.waitForTimeout(300);
  ok('Shortcut F9 opens payment when the bill has items', await page.evaluate(() => !!document.querySelector('#paymentModal.open')));
  await page.evaluate(() => closeModal('paymentModal'));
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });

  // ---- Input cleaning ----
  await page.evaluate(() => { rsmsDB.addCustomer({ name: '<img src=x onerror=window.__xss=1>Ravi', phone: '9000000001', email: '', address: '<script>window.__xss=2<\/script>' }); navigateTo('customers'); });
  await page.waitForTimeout(400);
  const xss = await page.evaluate(() => window.__xss);
  const stored = await page.evaluate(() => rsmsDB.getCustomers().slice(-1)[0].name);
  ok('Input cleaning: script/HTML is not executed', xss === undefined, 'stored as: ' + stored);
  ok('Input cleaning: < and > removed before saving', !/[<>]/.test(stored));
  await page.evaluate(() => navigateTo('pos')); await page.fill('#posSearchInput', '<img src=x onerror=window.__xss=3>zzz'); await page.waitForTimeout(300);
  ok('POS search box text is escaped', await page.evaluate(() => window.__xss === undefined));

  // ---- Theme ----
  await page.evaluate(() => navigateTo('dashboard')); await page.waitForTimeout(300);
  ok('Cinematic dark theme is the default', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'));
  await page.click('#themeToggleBtn'); await page.waitForTimeout(300);
  ok('Light theme switches on', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light'));
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });
  await page.evaluate(() => navigateTo('pos')); await page.waitForTimeout(300); await page.fill('#posSearchInput', '');
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });
  await page.evaluate(() => navigateTo('dayend')); await page.waitForTimeout(300);
  await page.screenshot({ path: require('os').tmpdir() + '/rsms-shot.png' });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(400);
  ok('Chosen theme is remembered after reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light'));
  await page.evaluate(() => toggleTheme());

  // ---- PWA ----
  await page.waitForTimeout(1500);
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
  ok('PWA: service worker registered', sw);
  const mf = await page.evaluate(async () => { const r = await fetch('manifest.webmanifest'); return (await r.json()).short_name; });
  ok('PWA: manifest is valid JSON', mf === 'FreshMart RSMS', mf);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await page.waitForTimeout(800);
  const offlineOk = await page.evaluate(() => !!document.querySelector('#loginScreen') && typeof window.rsmsDB !== 'undefined');
  ok('PWA: app opens with no internet', offlineOk);
  await ctx.setOffline(false);

  // ---- Remove demo ----
  await page.evaluate(() => { window.confirm = () => true; });
  await page.evaluate(() => { sessionStorage.setItem('rsms_session', JSON.stringify({ userId: 1, name: 'System Admin', username: 'admin', role: 'admin' })); });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
  await page.evaluate(() => { window.confirm = () => true; enhRemoveDemo(); });
  const left = await page.evaluate(() => rsmsDB.getSales().filter(s => s.demo).length);
  ok('Sample data can be removed', left === 0);

  console.log('\nJS errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await browser.close();
})();
