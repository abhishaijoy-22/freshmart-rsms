const { newPage, login, BASE } = require('./harness.js');
const rows = [];
const rec = (id, pass, actual) => { rows.push({ id, pass, actual }); console.log((pass ? 'PASS ' : 'FAIL ') + id + ' -> ' + actual); };
(async () => {
  const { browser, page, errors } = await newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'load' });

  // TC02 wrong password
  await page.fill('#loginUsername', 'admin'); await page.fill('#loginPassword', 'badpass'); await page.click('text=Sign In'); await page.waitForTimeout(200);
  let m = await page.textContent('#loginError');
  rec('TC02', /Invalid password/.test(m) && await page.isVisible('#loginScreen'), `Message shown: "${m}"; stayed on login screen`);
  // TC01 correct login
  await page.fill('#loginPassword', 'admin123'); await page.click('text=Sign In'); await page.waitForTimeout(600);
  rec('TC01', !(await page.isVisible('#loginScreen')) && await page.evaluate(() => state.currentUser.role === 'admin'), 'Dashboard opened for System Admin');

  // TC03 add product through the form
  await page.evaluate(() => { navigateTo('products'); openAddProductModal(); }); await page.waitForTimeout(300);
  await page.fill('#productFormName', 'Test Soap 100g'); await page.fill('#productFormBarcode', '890999000111');
  await page.fill('#productFormPrice', '40'); await page.fill('#productFormCostPrice', '30'); await page.fill('#productFormStock', '20'); await page.fill('#productFormMinLevel', '5');
  await page.evaluate(() => saveProductForm()); await page.waitForTimeout(300);
  const added = await page.evaluate(() => rsmsDB.getProducts().find(p => p.name === 'Test Soap 100g'));
  rec('TC03', !!added && added.stockQuantity === 20, added ? `Product saved with stock ${added.stockQuantity}, price ${added.price}` : 'not saved');

  // TC04 search
  await page.evaluate(() => navigateTo('pos')); await page.waitForTimeout(300);
  await page.fill('#posSearchInput', 'milk'); await page.waitForTimeout(300);
  const names = await page.evaluate(() => [...document.querySelectorAll('#posProductsGrid .product-name')].map(e => e.textContent));
  rec('TC04', names.length > 0 && names.every(n => /milk/i.test(n)), `Search "milk" showed: ${names.join(', ')}`);
  const bc = await page.evaluate(() => rsmsDB.getProductByBarcode('890123456001').name);
  await page.fill('#posSearchInput', '');

  // TC05 bill total, TC06 discount
  await page.evaluate(() => { state.pos.cart = []; addToCart(101); addToCart(102); updateCartQuantity(102, 1); addToCart(103); updateCartQuantity(103, 1); updateCartQuantity(103, 1); });
  await page.waitForTimeout(300);
  let calc = await page.evaluate(() => rsmsDB.calculateBill(state.pos.cart, 0, rsmsDB.getSettings().taxRate));
  rec('TC05', calc.subtotal === 406 && calc.taxAmount === 20.3 && calc.totalAmount === 426.3, `Rice x1 + Milk x2 + Biscuits x3: subtotal ${calc.subtotal}, tax ${calc.taxAmount}, total ${calc.totalAmount}`);
  await page.fill('#posDiscountInput', '50'); await page.waitForTimeout(200);
  const shown = await page.textContent('.cart-summary .summary-total, #posTotalDisplay').catch(() => '');
  calc = await page.evaluate(() => rsmsDB.calculateBill(state.pos.cart, state.pos.discount, rsmsDB.getSettings().taxRate));
  rec('TC06', calc.totalAmount === 376.3, `Discount 50 applied: total ${calc.totalAmount}`);

  // TC07 save bill and stock reduces
  const before = await page.evaluate(() => [101, 102, 103].map(i => rsmsDB.getProductById(i).stockQuantity));
  await page.evaluate(() => openPaymentModal()); await page.waitForTimeout(200);
  await page.evaluate(() => completeSaleTransaction()); await page.waitForTimeout(500);
  const after = await page.evaluate(() => [101, 102, 103].map(i => rsmsDB.getProductById(i).stockQuantity));
  const sale = await page.evaluate(() => rsmsDB.getSales()[0]);
  rec('TC07', sale.billNo === 'BILL-1026' && before[0] - after[0] === 1 && before[1] - after[1] === 2 && before[2] - after[2] === 3,
    `Bill ${sale.billNo} saved (cashier ${sale.cashierName}); stock Rice ${before[0]}->${after[0]}, Milk ${before[1]}->${after[1]}, Biscuits ${before[2]}->${after[2]}`);
  await page.evaluate(() => closeModal('receiptModal'));

  // TC08 more than stock
  await page.evaluate(() => { state.pos.cart = []; });
  const stockTea = await page.evaluate(() => rsmsDB.getProductById(104).stockQuantity);
  for (let i = 0; i < stockTea + 1; i++) await page.evaluate(() => addToCart(104));
  const qty = await page.evaluate(() => state.pos.cart.find(c => c.productId === 104).quantity);
  const toast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).filter(t => /Stock warning/.test(t)).pop() || '');
  rec('TC08', qty === stockTea && /Stock warning/.test(toast), `Tried ${stockTea + 1} of a product with ${stockTea}; bill kept ${qty}; message: "${toast.trim()}"`);
  await page.evaluate(() => { state.pos.cart = []; });

  // TC09 low stock list
  const low = await page.evaluate(() => rsmsDB.getLowStockProducts().map(p => p.name));
  await page.evaluate(() => navigateTo('inventory')); await page.waitForTimeout(300);
  const onPage = await page.textContent('#view-inventory');
  rec('TC09', low.length > 0 && low.every(n => onPage.includes(n)), `Low-stock list shows ${low.length} product(s): ${low.slice(0, 3).join(', ')}...`);

  // TC10 receive stock
  const milkBefore = await page.evaluate(() => rsmsDB.getProductById(102).stockQuantity);
  await page.evaluate(() => openReceiveStockModal(102)); await page.waitForTimeout(300);
  await page.fill('#receiveQuantity', '30'); await page.fill('#receiveInvoiceNo', 'INV-TEST-1');
  await page.evaluate(() => processReceiveStockSubmit()); await page.waitForTimeout(400);
  const milkAfter = await page.evaluate(() => rsmsDB.getProductById(102).stockQuantity);
  rec('TC10', milkAfter === milkBefore + 30, `Milk stock ${milkBefore} -> ${milkAfter} after receiving 30 units`);

  // TC11 daily report
  await page.evaluate(() => navigateTo('reports')); await page.waitForTimeout(400);
  const today = await page.evaluate(() => rsmsDB.getSalesReport({ period: 'today' }));
  rec('TC11', today.totalBills >= 1 && Math.abs(today.totalRevenue - 376.3) < 0.01, `Today: ${today.totalBills} bill(s), revenue ${today.totalRevenue}`);

  // TC12 role access
  await page.click('text=Logout'); await page.waitForTimeout(300);
  await login(page, 'cashier', 'cashier123');
  await page.evaluate(() => navigateTo('users')); await page.waitForTimeout(300);
  const t12 = await page.evaluate(() => ({ view: state.activeView, toast: [...document.querySelectorAll('.toast')].map(t => t.textContent).pop() || '', menu: !!document.querySelector('.nav-link[data-view="users"]') && getComputedStyle(document.querySelector('.nav-link[data-view="users"]').closest('li')).display !== 'none' }));
  rec('TC12', t12.view !== 'users' && !t12.menu, `Cashier cannot open User Accounts (menu hidden: ${!t12.menu}); message: "${t12.toast.trim()}"`);

  console.log('JS errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
