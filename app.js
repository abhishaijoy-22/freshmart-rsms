/**
 * Retail Store Management System (RSMS) - Application Controller
 * Handles Navigation, Role Guards, POS Billing, Modals, Receipt Printing,
 * Charts, and Automated Software Engineering Test Cases.
 */

// Application State
const state = {
  currentUser: null, // set when someone signs in (admin, manager, cashier, stock_clerk)
  activeView: 'dashboard',
  pos: {
    cart: [],
    selectedCustomer: 1, // Walk-in customer default
    discount: 0,
    discountType: 'fixed', // 'fixed' or 'percent'
    searchQuery: '',
    selectedCategory: 'all',
    paymentMode: 'Cash'
  }
};

// ================= ROLE PERMISSION MATRIX =================
// Cashier, Stock Clerk, Manager, Administrator per Report Table 4.1 & TC12
const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'pos', 'sales', 'products', 'categories', 'inventory', 'purchases', 'customers', 'suppliers', 'reports', 'activity', 'users', 'settings'],
  manager: ['dashboard', 'pos', 'sales', 'products', 'categories', 'inventory', 'purchases', 'customers', 'suppliers', 'reports', 'activity'],
  stock_clerk: ['dashboard', 'products', 'categories', 'inventory', 'purchases', 'suppliers'],
  cashier: ['dashboard', 'pos', 'sales', 'customers']
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initEventListeners();
  initAuth();
});

function initClock() {
  const clockEl = document.getElementById('liveClock');
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    clockEl.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString()}`;
  };
  update();
  setInterval(update, 1000);
}

// ================= EVENT LISTENERS & ROUTING =================
function initEventListeners() {
  // Navigation Links
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      navigateTo(targetView);
    });
  });

  // Login form: pressing Enter in either box signs in
  ['loginUsername', 'loginPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
  });
}

// Navigation with Role Guards (Fulfills Functional Requirement 4.2 & TC12)
function navigateTo(viewId) {
  if (!state.currentUser) return;
  const allowedViews = ROLE_PERMISSIONS[state.currentUser.role] || [];
  if (!allowedViews.includes(viewId)) {
    showToast(`Access Denied: The "${formatRole(state.currentUser.role)}" role cannot access "${formatViewName(viewId)}".`, "error");
    return;
  }

  state.activeView = viewId;

  // Update Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-view') === viewId);
  });

  // Update Views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${viewId}`);
  });

  // Update Header Title
  const titleEl = document.getElementById('currentPageTitle');
  if (titleEl) {
    titleEl.innerHTML = getViewIconAndTitle(viewId);
  }

  // Refresh view contents
  renderView(viewId);
}

function getViewIconAndTitle(viewId) {
  const map = {
    dashboard: '<i class="fas fa-chart-pie text-primary"></i> Store Dashboard',
    pos: '<i class="fas fa-cash-register text-success"></i> Sales & Billing POS',
    products: '<i class="fas fa-boxes text-info"></i> Products & Catalog',
    inventory: '<i class="fas fa-warehouse text-warning"></i> Inventory & Stock Alerts',
    purchases: '<i class="fas fa-truck-loading text-purple"></i> Stock In & Purchases',
    customers: '<i class="fas fa-users text-primary"></i> Customers Management',
    suppliers: '<i class="fas fa-truck text-info"></i> Suppliers Directory',
    reports: '<i class="fas fa-file-invoice-dollar text-success"></i> Reports & Analytics',
    users: '<i class="fas fa-user-shield text-danger"></i> System User Management',
    settings: '<i class="fas fa-cog text-secondary"></i> System Settings & Backup',
    sales: '<i class="fas fa-receipt text-primary"></i> Sales History & Bills',
    categories: '<i class="fas fa-tags text-info"></i> Product Categories',
    activity: '<i class="fas fa-clock-rotate-left text-secondary"></i> Activity Log'
  };
  return map[viewId] || 'Retail Store Management';
}

function formatViewName(viewId) {
  return viewId.charAt(0).toUpperCase() + viewId.slice(1);
}

function formatRole(role) {
  const map = {
    admin: 'Administrator',
    manager: 'Store Manager',
    cashier: 'Cashier',
    stock_clerk: 'Stock Clerk'
  };
  return map[role] || role;
}

function updateUserBadge() {
  if (!state.currentUser) return;
  const badgeEl = document.getElementById('userRoleBadge');
  const nameEl = document.getElementById('userNameDisplay');
  const avatarEl = document.getElementById('userAvatarDisplay');

  if (badgeEl) {
    badgeEl.className = `role-badge-pill role-badge-${state.currentUser.role}`;
    badgeEl.textContent = formatRole(state.currentUser.role);
  }
  if (nameEl) nameEl.textContent = state.currentUser.name;
  if (avatarEl) {
    const initials = state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    avatarEl.textContent = initials.toUpperCase();
  }

  // Update notification count badge for Low Stock + Expiry
  const lowStock = window.rsmsDB.getLowStockProducts();
  const expiring = window.rsmsDB.getExpiringProducts(30);
  const totalAlerts = lowStock.length + expiring.length;
  const notifBadge = document.getElementById('alertCountBadge');
  if (notifBadge) {
    notifBadge.style.display = totalAlerts > 0 ? 'block' : 'none';
  }
  const sideNavAlertBadge = document.getElementById('sideNavAlertBadge');
  if (sideNavAlertBadge) {
    sideNavAlertBadge.textContent = lowStock.length;
    sideNavAlertBadge.style.display = lowStock.length > 0 ? 'inline-block' : 'none';
  }
}

// ================= RENDER MAIN APP =================
function renderApp() {
  updateUserBadge();
  renderView(state.activeView);
}

function renderView(viewId) {
  switch (viewId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'pos':
      renderPOS();
      break;
    case 'products':
      renderProductsTable();
      break;
    case 'inventory':
      renderInventoryView();
      break;
    case 'purchases':
      renderPurchasesView();
      break;
    case 'customers':
      renderCustomersView();
      break;
    case 'suppliers':
      renderSuppliersView();
      break;
    case 'reports':
      renderReportsView();
      break;
    case 'users':
      renderUsersView();
      break;
    case 'settings':
      renderSettingsView();
      break;
    case 'sales':
      renderSalesView();
      break;
    case 'categories':
      renderCategoriesView();
      break;
    case 'activity':
      renderActivityView();
      break;
  }
}

// ================= 1. DASHBOARD VIEW =================
function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const report = window.rsmsDB.getSalesReport({ period: 'today' });
  const allSales = window.rsmsDB.getSales();
  const lowStock = window.rsmsDB.getLowStockProducts();
  const expiring = window.rsmsDB.getExpiringProducts(30);
  const settings = window.rsmsDB.getSettings();

  const totalStockUnits = window.rsmsDB.getProducts().reduce((acc, p) => acc + p.stockQuantity, 0);

  container.innerHTML = `
    <!-- Low Stock Alert Banner if items are low -->
    ${lowStock.length > 0 ? `
      <div class="alert-banner">
        <div class="alert-content">
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <div class="alert-title">Low Stock Alert: ${lowStock.length} Product(s) Below Minimum Reorder Level</div>
            <div class="alert-desc">${lowStock.map(p => `${p.name} (Stock: ${p.stockQuantity}/${p.minimumLevel})`).slice(0, 3).join(', ')}${lowStock.length > 3 ? ` and ${lowStock.length - 3} more...` : ''}</div>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="navigateTo('inventory')">
          <i class="fas fa-box-open"></i> Restock Now
        </button>
      </div>
    ` : ''}

    <!-- KPI Statistics Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <h3>Today's Sales</h3>
          <div class="stat-number">${settings.currency}${report.totalRevenue.toFixed(2)}</div>
          <div class="stat-trend trend-up"><i class="fas fa-receipt"></i> ${report.totalBills} bill(s) made today</div>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-cash-register"></i></div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <h3>Total Products</h3>
          <div class="stat-number">${window.rsmsDB.getProducts().length}</div>
          <div class="stat-trend"><i class="fas fa-cubes"></i> ${totalStockUnits} units in stock</div>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-boxes"></i></div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <h3>Low Stock Items</h3>
          <div class="stat-number" style="color: ${lowStock.length > 0 ? '#ef4444' : '#10b981'}">${lowStock.length}</div>
          <div class="stat-trend ${lowStock.length > 0 ? 'trend-down' : 'trend-up'}">
            <i class="fas fa-bell"></i> ${lowStock.length > 0 ? 'Reorder needed' : 'Stock levels healthy'}
          </div>
        </div>
        <div class="stat-icon stat-icon-amber"><i class="fas fa-exclamation-circle"></i></div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <h3>Inventory Value</h3>
          <div class="stat-number">${settings.currency}${report.inventoryValuation.retailValue.toFixed(0)}</div>
          <div class="stat-trend trend-up"><i class="fas fa-coins"></i> Potential Profit: ${settings.currency}${report.inventoryValuation.potentialProfit.toFixed(0)}</div>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-hand-holding-usd"></i></div>
      </div>
    </div>

    <!-- Quick Actions Row -->
    <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
      <button class="btn btn-primary" onclick="navigateTo('pos')">
        <i class="fas fa-plus-circle"></i> Create New Bill (POS)
      </button>
      <button class="btn btn-success" onclick="openReceiveStockModal()">
        <i class="fas fa-truck-loading"></i> Receive Stock from Supplier
      </button>
      <button class="btn btn-secondary" onclick="openAddProductModal()">
        <i class="fas fa-box-tissue"></i> Add New Product
      </button>
      <button class="btn btn-secondary" onclick="navigateTo('reports')">
        <i class="fas fa-chart-line"></i> View Sales Reports
      </button>
    </div>

    ${buildSalesTrendHTML()}

    <!-- Recent Sales Table & Top Products -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
      <div class="table-card">
        <div class="table-header">
          <h2><i class="fas fa-history text-primary"></i> Recent Completed Bills</h2>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('pos')">Start Billing</button>
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${allSales.slice(0, 5).map(sale => `
                <tr>
                  <td><strong>${sale.billNo}</strong>${sale.status === 'Cancelled' ? ' <span class="stock-tag stock-tag-out">Cancelled</span>' : ''}</td>
                  <td>${sale.date}</td>
                  <td>${sale.customerName}</td>
                  <td><span class="role-badge-pill role-badge-cashier">${sale.paymentMode}</span></td>
                  <td><strong>${settings.currency}${sale.totalAmount.toFixed(2)}</strong></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewReceipt('${sale.billNo}')">
                      <i class="fas fa-receipt"></i> Bill
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Selling Products -->
      <div class="table-card">
        <div class="table-header">
          <h2><i class="fas fa-crown text-warning"></i> Top Products</h2>
        </div>
        <div style="padding: 16px;">
          ${report.topSellingProducts.length === 0 ? '<p style="color:#94a3b8; font-size:13px;">No sales recorded yet.</p>' : ''}
          ${report.topSellingProducts.slice(0, 5).map((p, idx) => `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0;">
              <div>
                <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${idx + 1}. ${p.name}</div>
                <div style="font-size: 11px; color: #64748b;">${p.quantity} units sold</div>
              </div>
              <div style="font-weight: 700; font-size: 13px; color: #10b981;">${settings.currency}${p.revenue.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ================= 2. POS BILLING SCREEN (CASHIER TERMINAL) =================
// Implements Activity Diagram (Figure 7), State Chart (Figure 10) & TC05, TC06, TC07, TC08
function renderPOS() {
  const container = document.getElementById('view-pos');
  if (!container) return;

  const categories = window.rsmsDB.getCategories();
  const customers = window.rsmsDB.getCustomers();
  const settings = window.rsmsDB.getSettings();

  container.innerHTML = `
    <div class="pos-layout">
      <!-- Left Column: Product Catalog & Search -->
      <div class="pos-catalog">
        <div class="pos-search-bar">
          <div class="search-input-wrap">
            <i class="fas fa-search"></i>
            <input type="text" id="posSearchInput" class="search-input" placeholder="Search product by name or scan barcode (e.g. 890123456001)..." value="${state.pos.searchQuery}">
          </div>
          <button class="btn btn-secondary btn-sm" onclick="clearPOSSearch()" title="Clear Search">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Category Pills -->
        <div class="category-pills">
          <button class="cat-pill ${state.pos.selectedCategory === 'all' ? 'active' : ''}" onclick="selectPOSCategory('all')">
            <i class="fas fa-th-large"></i> All Items
          </button>
          ${categories.map(c => `
            <button class="cat-pill ${state.pos.selectedCategory == c.categoryId ? 'active' : ''}" onclick="selectPOSCategory(${c.categoryId})">
              <i class="fas ${c.icon}"></i> ${c.name}
            </button>
          `).join('')}
        </div>

        <!-- Product Cards Grid -->
        <div class="products-grid" id="posProductsGrid">
          <!-- Populated by renderPOSProducts() -->
        </div>
      </div>

      <!-- Right Column: Interactive Bill / Cart Panel (Figure 7 & 10) -->
      <div class="pos-cart-panel">
        <div class="cart-header">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Active Bill</div>
            <div style="font-weight: 700; font-size: 15px; color: #0f172a;">
              <span class="bill-badge">${settings.invoicePrefix}${settings.nextInvoiceNumber}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b;">Cashier</div>
            <div style="font-size: 13px; font-weight: 600;">${state.currentUser.name}</div>
          </div>
        </div>

        <!-- Customer Selection -->
        <div class="customer-select-bar">
          <i class="fas fa-user-tag text-muted"></i>
          <select id="posCustomerSelect" class="customer-dropdown" onchange="state.pos.selectedCustomer = this.value">
            ${customers.map(c => `
              <option value="${c.customerId}" ${state.pos.selectedCustomer == c.customerId ? 'selected' : ''}>
                ${c.name} (${c.phone})
              </option>
            `).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" onclick="openQuickAddCustomerModal()" title="Add New Customer">
            <i class="fas fa-user-plus"></i>
          </button>
        </div>

        <!-- Cart Items List -->
        <div class="cart-items-wrap" id="posCartItemsList">
          <!-- Populated by updateCartList() -->
        </div>

        <!-- Cart Summary & Calculation (Section 5.1) -->
        <div class="cart-summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <span id="posSubtotalDisplay">${settings.currency}0.00</span>
          </div>

          <div class="summary-row">
            <span>Tax Rate (${settings.taxRate}%)</span>
            <span id="posTaxDisplay">${settings.currency}0.00</span>
          </div>

          <div class="summary-row" style="align-items: center;">
            <span>Discount (${settings.currency})</span>
            <div class="discount-input-row" style="margin-bottom: 0;">
              <input type="number" id="posDiscountInput" class="discount-input" placeholder="0.00" min="0" value="${state.pos.discount}">
            </div>
          </div>

          <div class="summary-row total-row">
            <span>Total Amount</span>
            <span id="posTotalDisplay" style="color: #2563eb;">${settings.currency}0.00</span>
          </div>

          <!-- Checkout & Cancel Action Buttons -->
          <div class="cart-actions">
            <button class="btn btn-danger btn-sm" onclick="cancelCurrentBill()" title="Cancel Bill (State: Cancelled)">
              <i class="fas fa-trash-alt"></i> Clear
            </button>
            <button class="btn btn-primary btn-full" id="posCheckoutBtn" onclick="openPaymentModal()">
              <i class="fas fa-check-circle"></i> Pay & Print Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindPOSEvents();
  renderPOSProducts();
  updateCartUI();
}

function selectPOSCategory(catId) {
  state.pos.selectedCategory = catId;
  renderPOS();
}

function clearPOSSearch() {
  state.pos.searchQuery = '';
  const input = document.getElementById('posSearchInput');
  if (input) input.value = '';
  renderPOSProducts();
}

function renderPOSProducts() {
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;

  const products = window.rsmsDB.searchProducts(state.pos.searchQuery, state.pos.selectedCategory);
  const settings = window.rsmsDB.getSettings();

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
        <i class="fas fa-search" style="font-size: 32px; margin-bottom: 8px;"></i>
        <p>No products found matching "${state.pos.searchQuery}"</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => {
    let stockClass = "stock-tag-in";
    let stockLabel = `In Stock: ${p.stockQuantity}`;
    if (p.stockQuantity <= 0) {
      stockClass = "stock-tag-out";
      stockLabel = "Out of Stock";
    } else if (p.stockQuantity <= p.minimumLevel) {
      stockClass = "stock-tag-low";
      stockLabel = `Low: ${p.stockQuantity}`;
    }

    return `
      <div class="product-card" onclick="addToCart(${p.productId})">
        <div class="product-img-wrap">
          <img src="${p.imageUrl}" alt="${p.name}" class="product-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60'">
          <span class="stock-tag ${stockClass}">${stockLabel}</span>
        </div>
        <div class="product-details">
          <div class="product-name" title="${p.name}">${p.name}</div>
          <div class="product-barcode">${p.barcode}</div>
          <div class="product-price-row">
            <span class="product-price">${settings.currency}${p.price.toFixed(2)}</span>
            <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${p.productId})" title="Add to Bill">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// POS Cart Operations & Stock Validation (Figure 7 & TC05, TC08)
function addToCart(productId) {
  const product = window.rsmsDB.getProductById(productId);
  if (!product) return;

  // Check if product is already out of stock
  if (product.stockQuantity <= 0) {
    showToast(`Cannot add "${product.name}": Product is OUT OF STOCK.`, "error");
    return;
  }

  const existingItem = state.pos.cart.find(item => item.productId === productId);
  const currentQtyInCart = existingItem ? existingItem.quantity : 0;

  // Stock check: requested quantity cannot exceed available stock
  if (currentQtyInCart + 1 > product.stockQuantity) {
    showToast(`Stock warning: Only ${product.stockQuantity} unit(s) of "${product.name}" available in store.`, "warning");
    return;
  }

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.pos.cart.push({
      productId: product.productId,
      productName: product.name,
      price: product.price,
      costPrice: product.costPrice,
      quantity: 1
    });
  }

  updateCartUI();
  showToast(`Added "${product.name}" to bill`, "success");
}

function updateCartQuantity(productId, delta) {
  const item = state.pos.cart.find(i => i.productId === productId);
  if (!item) return;

  const product = window.rsmsDB.getProductById(productId);
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  // Stock check
  if (product && newQty > product.stockQuantity) {
    showToast(`Cannot add more: Only ${product.stockQuantity} unit(s) of "${product.name}" available in stock.`, "warning");
    return;
  }

  item.quantity = newQty;
  updateCartUI();
}

function removeFromCart(productId) {
  state.pos.cart = state.pos.cart.filter(i => i.productId !== productId);
  updateCartUI();
}

function cancelCurrentBill() {
  if (state.pos.cart.length === 0) return;
  if (confirm("Are you sure you want to cancel and clear the current bill? (State: Cancelled)")) {
    state.pos.cart = [];
    state.pos.discount = 0;
    const discInput = document.getElementById('posDiscountInput');
    if (discInput) discInput.value = '';
    updateCartUI();
    showToast("Bill cancelled and cleared.", "info");
  }
}

function updateCartUI() {
  const container = document.getElementById('posCartItemsList');
  if (!container) return;

  const settings = window.rsmsDB.getSettings();

  if (state.pos.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-basket"></i>
        <div style="font-size: 14px; font-weight: 600;">Bill is Empty</div>
        <p style="font-size: 12px;">Click any product card or scan a barcode to add items to this bill.</p>
      </div>
    `;
    updateCartTotals();
    return;
  }

  container.innerHTML = state.pos.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.productName}</div>
        <div class="cart-item-price">${settings.currency}${item.price.toFixed(2)} each</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="updateCartQuantity(${item.productId}, -1)">-</button>
        <span class="qty-value">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQuantity(${item.productId}, 1)">+</button>
      </div>
      <div class="cart-item-total">${settings.currency}${(item.price * item.quantity).toFixed(2)}</div>
      <button class="cart-item-del" onclick="removeFromCart(${item.productId})" title="Remove item">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');

  updateCartTotals();
}

function updateCartTotals() {
  const settings = window.rsmsDB.getSettings();
  const calculation = window.rsmsDB.calculateBill(state.pos.cart, state.pos.discount, settings.taxRate);

  const subtotalEl = document.getElementById('posSubtotalDisplay');
  const taxEl = document.getElementById('posTaxDisplay');
  const totalEl = document.getElementById('posTotalDisplay');
  const checkoutBtn = document.getElementById('posCheckoutBtn');

  if (subtotalEl) subtotalEl.textContent = `${settings.currency}${calculation.subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `${settings.currency}${calculation.taxAmount.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `${settings.currency}${calculation.totalAmount.toFixed(2)}`;

  if (checkoutBtn) {
    checkoutBtn.disabled = state.pos.cart.length === 0;
  }
}

// Payment Modal Flow (State Chart: Payment Pending -> Paid -> Print Bill)
function openPaymentModal() {
  if (state.pos.cart.length === 0) {
    showToast("Cannot checkout: Cart is empty.", "warning");
    return;
  }

  const settings = window.rsmsDB.getSettings();
  const calc = window.rsmsDB.calculateBill(state.pos.cart, state.pos.discount, settings.taxRate);

  const modalEl = document.getElementById('paymentModal');
  if (!modalEl) return;

  document.getElementById('payTotalAmountDisplay').textContent = `${settings.currency}${calc.totalAmount.toFixed(2)}`;
  document.getElementById('cashTenderedInput').value = calc.totalAmount.toFixed(2);
  calculateCashChange(calc.totalAmount);

  // Set default mode
  setPaymentMode('Cash');

  modalEl.classList.add('open');
}

function setPaymentMode(mode) {
  state.pos.paymentMode = mode;
  document.querySelectorAll('.pay-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  document.getElementById('payModeCashTab').style.display = mode === 'Cash' ? 'block' : 'none';
  document.getElementById('payModeCardTab').style.display = mode === 'Card' ? 'block' : 'none';
  document.getElementById('payModeUpiTab').style.display = mode === 'UPI' ? 'block' : 'none';

  if (mode === 'UPI') {
    generateUpiQR();
  }
}

function calculateCashChange(totalAmount) {
  const calc = window.rsmsDB.calculateBill(state.pos.cart, state.pos.discount, window.rsmsDB.getSettings().taxRate);
  const total = totalAmount || calc.totalAmount;
  const tendered = parseFloat(document.getElementById('cashTenderedInput').value) || 0;
  const change = Math.max(0, tendered - total);
  const changeEl = document.getElementById('cashChangeDisplay');
  if (changeEl) {
    changeEl.textContent = `${window.rsmsDB.getSettings().currency}${change.toFixed(2)}`;
  }
}

function generateUpiQR() {
  const calc = window.rsmsDB.calculateBill(state.pos.cart, state.pos.discount, window.rsmsDB.getSettings().taxRate);
  const upiId = "freshmart@upi";
  const storeName = "FreshMart";
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${calc.totalAmount.toFixed(2)}&cu=INR`;

  const container = document.getElementById('upiQrCodeContainer');
  if (!container) return;

  // Interactive high quality SVG QR code representation with visual scan aesthetics
  container.innerHTML = `
    <div style="background:#fff; padding:14px; border-radius:8px; display:inline-block; border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <svg width="160" height="160" viewBox="0 0 100 100" style="display:block; margin:0 auto;">
        <!-- QR Code simulation pattern -->
        <rect width="100" height="100" fill="#ffffff" />
        <!-- Corner 1 -->
        <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="3" />
        <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
        <rect x="13" y="13" width="9" height="9" fill="#2563eb" />
        <!-- Corner 2 -->
        <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="3" />
        <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
        <rect x="78" y="13" width="9" height="9" fill="#2563eb" />
        <!-- Corner 3 -->
        <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="3" />
        <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
        <rect x="13" y="78" width="9" height="9" fill="#2563eb" />
        <!-- Data dots -->
        <rect x="35" y="10" width="5" height="15" fill="#0f172a" />
        <rect x="45" y="5" width="8" height="8" fill="#0f172a" />
        <rect x="55" y="12" width="10" height="6" fill="#0f172a" />
        <rect x="35" y="35" width="30" height="30" fill="#0f172a" rx="2" />
        <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
        <circle cx="50" cy="50" r="5" fill="#10b981" />
        <rect x="10" y="40" width="15" height="6" fill="#0f172a" />
        <rect x="10" y="52" width="10" height="10" fill="#0f172a" />
        <rect x="75" y="40" width="15" height="8" fill="#0f172a" />
        <rect x="80" y="55" width="12" height="12" fill="#0f172a" />
        <rect x="38" y="75" width="12" height="8" fill="#0f172a" />
        <rect x="55" y="80" width="15" height="12" fill="#0f172a" />
        <rect x="75" y="75" width="18" height="18" fill="#0f172a" />
      </svg>
      <div style="font-size:11px; font-weight:700; color:#0f172a; margin-top:8px;">Scan with Google Pay, PhonePe, Paytm</div>
      <div style="font-size:10px; color:#64748b; font-family:monospace;">${upiId}</div>
    </div>
  `;
}

// Complete Sale Transaction (Figure 7 & 10, TC07)
function completeSaleTransaction() {
  try {
    const customerId = state.pos.selectedCustomer;
    const result = window.rsmsDB.processSale({
      customerId: customerId,
      userId: state.currentUser.userId,
      cashierName: state.currentUser.name,
      cartItems: state.pos.cart,
      discountAmount: state.pos.discount,
      paymentMode: state.pos.paymentMode
    });

    closeModal('paymentModal');

    // Reset Cart
    state.pos.cart = [];
    state.pos.discount = 0;
    const discInput = document.getElementById('posDiscountInput');
    if (discInput) discInput.value = '';

    // Alert if any product reached low stock
    if (result.lowStockAlerts && result.lowStockAlerts.length > 0) {
      showToast(`Warning: Product(s) [${result.lowStockAlerts.join(', ')}] have reached LOW STOCK level!`, "warning");
    }

    showToast(`Bill ${result.sale.billNo} generated and stock updated successfully!`, "success");

    // Display Thermal Printable Bill (Section 5.1 Sample Bill)
    viewReceipt(result.sale.billNo);

    // Refresh POS screen & badge
    renderPOS();
    updateUserBadge();

  } catch (err) {
    showToast(err.message, "error");
  }
}

// ================= THERMAL RECEIPT MODAL (SAMPLE BILL SECTION 5.1) =================
function viewReceipt(billNo) {
  const sale = window.rsmsDB.getSaleByBillNo(billNo);
  if (!sale) {
    showToast(`Bill "${billNo}" not found.`, "error");
    return;
  }

  const settings = window.rsmsDB.getSettings();
  const modalEl = document.getElementById('receiptModal');
  const container = document.getElementById('thermalReceiptContainer');
  if (!container || !modalEl) return;

  container.innerHTML = `
    <div class="receipt-wrapper" id="printableThermalReceipt">
      <div class="receipt-center">
        <div class="receipt-store-title">${settings.storeName}</div>
        <div style="font-size: 11px;">${settings.address}</div>
        <div style="font-size: 10px;">Phone: ${settings.phone} | GSTIN: ${settings.gstin}</div>
      </div>

      <div class="receipt-double-divider"></div>

      ${sale.status === 'Cancelled' ? `<div style="text-align:center; border:2px solid #b91c1c; color:#b91c1c; font-weight:800; padding:4px; margin-bottom:6px;">*** CANCELLED ***<div style="font-size:10px; font-weight:600;">${esc(sale.cancelReason || '')}</div></div>` : ''}
      <div class="receipt-row">
        <span>Bill No: <strong>${sale.billNo}</strong></span>
        <span>Cashier: <strong>${sale.cashierName}</strong></span>
      </div>
      <div class="receipt-row">
        <span>Date: ${sale.date.split(' ')[0]}</span>
        <span>Time: ${sale.date.split(' ')[1] || ''}</span>
      </div>
      <div class="receipt-row">
        <span>Customer: <strong>${sale.customerName}</strong></span>
      </div>

      <div class="receipt-divider"></div>

      <table class="receipt-items-table">
        <thead>
          <tr>
            <th style="width: 45%;">Item</th>
            <th style="width: 15%; text-align: center;">Qty</th>
            <th style="width: 20%; text-align: right;">Price</th>
            <th style="width: 20%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map(item => `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${item.price.toFixed(2)}</td>
              <td style="text-align: right;">${item.itemTotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="receipt-divider"></div>

      <div class="receipt-row">
        <span>Subtotal</span>
        <span>${sale.subtotal.toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span>Tax (${sale.taxRate}%)</span>
        <span>${sale.taxAmount.toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span>Discount</span>
        <span>${sale.discountAmount.toFixed(2)}</span>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-row receipt-total-big">
        <span>Total Amount</span>
        <span>${settings.currency}${sale.totalAmount.toFixed(2)}</span>
      </div>
      <div class="receipt-row" style="margin-top: 4px;">
        <span>Payment Mode:</span>
        <span><strong>${sale.paymentMode}</strong></span>
      </div>

      <div class="receipt-double-divider"></div>

      <div class="receipt-center">
        <!-- Visual Barcode for the bill -->
        <svg class="barcode-svg" viewBox="0 0 200 40">
          <rect x="10" y="0" width="3" height="35" fill="#000" />
          <rect x="15" y="0" width="2" height="35" fill="#000" />
          <rect x="20" y="0" width="4" height="35" fill="#000" />
          <rect x="28" y="0" width="1" height="35" fill="#000" />
          <rect x="32" y="0" width="5" height="35" fill="#000" />
          <rect x="42" y="0" width="2" height="35" fill="#000" />
          <rect x="48" y="0" width="3" height="35" fill="#000" />
          <rect x="55" y="0" width="4" height="35" fill="#000" />
          <rect x="62" y="0" width="1" height="35" fill="#000" />
          <rect x="68" y="0" width="4" height="35" fill="#000" />
          <rect x="76" y="0" width="2" height="35" fill="#000" />
          <rect x="82" y="0" width="3" height="35" fill="#000" />
          <rect x="88" y="0" width="5" height="35" fill="#000" />
          <rect x="98" y="0" width="2" height="35" fill="#000" />
          <rect x="104" y="0" width="4" height="35" fill="#000" />
          <rect x="112" y="0" width="2" height="35" fill="#000" />
          <rect x="118" y="0" width="5" height="35" fill="#000" />
          <rect x="128" y="0" width="2" height="35" fill="#000" />
          <rect x="135" y="0" width="4" height="35" fill="#000" />
          <rect x="142" y="0" width="3" height="35" fill="#000" />
          <rect x="150" y="0" width="2" height="35" fill="#000" />
          <rect x="156" y="0" width="5" height="35" fill="#000" />
          <rect x="166" y="0" width="2" height="35" fill="#000" />
          <rect x="174" y="0" width="4" height="35" fill="#000" />
          <rect x="182" y="0" width="3" height="35" fill="#000" />
        </svg>
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em;">* ${sale.billNo} *</div>
        <div style="font-size: 11px; margin-top: 6px; font-weight: 600;">*** Thank You! Please Visit Again! ***</div>
      </div>
    </div>
  `;

  modalEl.classList.add('open');
}

function printReceipt() {
  window.print();
}

// ================= 3. PRODUCTS & CATALOG MANAGEMENT =================
function renderProductsTable() {
  const container = document.getElementById('view-products');
  if (!container) return;

  const products = window.rsmsDB.getProducts();
  const categories = window.rsmsDB.getCategories();
  const settings = window.rsmsDB.getSettings();

  const isManagerOrAdmin = ['admin', 'manager'].includes(state.currentUser.role);

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-boxes text-primary"></i> Product Catalog & Inventory List</h2>
          <div style="font-size: 12px; color: #64748b;">Total ${products.length} registered products</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="openAddProductModal()">
            <i class="fas fa-plus"></i> Add Product
          </button>
          <button class="btn btn-secondary btn-sm" onclick="exportProductsCSV()">
            <i class="fas fa-file-export"></i> Export CSV
          </button>
        </div>
      </div>

      <div style="padding: 12px 20px; background: #fafbfc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 12px; flex-wrap: wrap;">
        <input type="text" id="productFilterInput" class="form-control" style="max-width: 260px;" placeholder="Filter by name or barcode..." oninput="filterProductsTable(this.value)">
        <select id="productCategoryFilter" class="form-control" style="max-width: 200px;" onchange="filterProductsByCategory(this.value)">
          <option value="all">All Categories</option>
          ${categories.map(c => `<option value="${c.categoryId}">${c.name}</option>`).join('')}
        </select>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="productsDataTable">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Barcode</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Stock Qty</th>
              <th>Min Alert</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="productsTableBody">
            ${renderProductsRows(products, categories, settings, isManagerOrAdmin)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProductsRows(products, categories, settings, isManagerOrAdmin) {
  const now = new Date();

  return products.map(p => {
    const cat = categories.find(c => c.categoryId === p.categoryId) || { name: 'General' };
    const expDate = p.expiryDate ? new Date(p.expiryDate) : null;
    const isExpired = expDate && expDate < now;
    const isLowStock = p.stockQuantity <= p.minimumLevel;

    let statusPill = `<span class="stock-tag stock-tag-in">In Stock</span>`;
    if (p.stockQuantity <= 0) {
      statusPill = `<span class="stock-tag stock-tag-out">Out of Stock</span>`;
    } else if (isLowStock) {
      statusPill = `<span class="stock-tag stock-tag-low">Low Stock</span>`;
    }
    if (isExpired) {
      statusPill += ` <span class="stock-tag stock-tag-out" style="margin-left: 4px;">Expired</span>`;
    }

    return `
      <tr data-id="${p.productId}">
        <td>
          <div style="display: flex; align-items: center;">
            <img src="${p.imageUrl}" alt="${p.name}" class="table-prod-thumb" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60'">
            <div>
              <div style="font-weight: 600; color: #0f172a;">${p.name}</div>
              <div style="font-size: 11px; color: #94a3b8;">ID: #${p.productId}</div>
            </div>
          </div>
        </td>
        <td><span class="role-badge-pill role-badge-cashier">${cat.name}</span></td>
        <td><code style="font-family: monospace; font-size: 12px;">${p.barcode}</code></td>
        <td>${settings.currency}${p.costPrice.toFixed(2)}</td>
        <td><strong>${settings.currency}${p.price.toFixed(2)}</strong></td>
        <td>
          <strong style="color: ${isLowStock ? '#ef4444' : '#10b981'}; font-size: 14px;">
            ${p.stockQuantity}
          </strong>
        </td>
        <td>${p.minimumLevel}</td>
        <td>
          <span style="color: ${isExpired ? '#ef4444' : '#64748b'}; font-weight: ${isExpired ? '700' : 'normal'};">
            ${p.expiryDate || 'N/A'}
          </span>
        </td>
        <td>${statusPill}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${p.productId})" title="Edit Product">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openAdjustStockModal(${p.productId})" title="Remove damaged / expired stock">
              <i class="fas fa-minus-circle"></i>
            </button>
            ${isManagerOrAdmin ? `
              <button class="btn btn-danger btn-sm" onclick="deleteProductPrompt(${p.productId})" title="Delete Product">
                <i class="fas fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterProductsTable(query) {
  const q = query.toLowerCase();
  const rows = document.querySelectorAll('#productsTableBody tr');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(q) ? '' : 'none';
  });
}

function filterProductsByCategory(catId) {
  const products = window.rsmsDB.getProducts();
  const filtered = catId === 'all' ? products : products.filter(p => p.categoryId === parseInt(catId));
  const categories = window.rsmsDB.getCategories();
  const settings = window.rsmsDB.getSettings();
  const isManagerOrAdmin = ['admin', 'manager'].includes(state.currentUser.role);
  document.getElementById('productsTableBody').innerHTML = renderProductsRows(filtered, categories, settings, isManagerOrAdmin);
}

// Add Product Modal & Flow
function openAddProductModal() {
  const modalEl = document.getElementById('productFormModal');
  const titleEl = document.getElementById('productFormModalTitle');
  if (!modalEl) return;

  titleEl.innerHTML = '<i class="fas fa-plus-circle text-primary"></i> Add New Product';
  document.getElementById('productFormId').value = '';
  document.getElementById('productFormName').value = '';
  document.getElementById('productFormBarcode').value = `890123456${Math.floor(100 + Math.random() * 900)}`;
  document.getElementById('productFormPrice').value = '';
  document.getElementById('productFormCostPrice').value = '';
  document.getElementById('productFormStock').value = '25';
  document.getElementById('productFormMinLevel').value = '10';
  document.getElementById('productFormExpiry').value = '2027-12-31';
  document.getElementById('productFormImage').value = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
  document.getElementById('productFormPrice').disabled = false;
  document.getElementById('productFormCostPrice').disabled = false;

  // Populate categories
  const catSelect = document.getElementById('productFormCategory');
  catSelect.innerHTML = window.rsmsDB.getCategories().map(c => `
    <option value="${c.categoryId}">${c.name}</option>
  `).join('');

  modalEl.classList.add('open');
}

function openEditProductModal(productId) {
  const product = window.rsmsDB.getProductById(productId);
  if (!product) return;

  // Price change check (Section 2.3: Only manager/admin can change price)
  const isManagerOrAdmin = ['admin', 'manager'].includes(state.currentUser.role);
  if (!isManagerOrAdmin && state.currentUser.role === 'cashier') {
    showToast("Access Denied: Cashiers cannot modify product details or prices.", "error");
    return;
  }

  const modalEl = document.getElementById('productFormModal');
  const titleEl = document.getElementById('productFormModalTitle');
  if (!modalEl) return;

  titleEl.innerHTML = `<i class="fas fa-edit text-primary"></i> Edit Product: ${product.name}`;
  document.getElementById('productFormId').value = product.productId;
  document.getElementById('productFormName').value = product.name;
  document.getElementById('productFormBarcode').value = product.barcode;
  document.getElementById('productFormPrice').value = product.price;
  document.getElementById('productFormCostPrice').value = product.costPrice;
  document.getElementById('productFormStock').value = product.stockQuantity;
  document.getElementById('productFormMinLevel').value = product.minimumLevel;
  document.getElementById('productFormExpiry').value = product.expiryDate || '';
  document.getElementById('productFormImage').value = product.imageUrl;
  // Only managers and admins may change prices (Section 2.3 of the report)
  document.getElementById('productFormPrice').disabled = !isManagerOrAdmin;
  document.getElementById('productFormCostPrice').disabled = !isManagerOrAdmin;

  const catSelect = document.getElementById('productFormCategory');
  catSelect.innerHTML = window.rsmsDB.getCategories().map(c => `
    <option value="${c.categoryId}" ${c.categoryId === product.categoryId ? 'selected' : ''}>${c.name}</option>
  `).join('');

  modalEl.classList.add('open');
}

function saveProductForm() {
  try {
    const id = document.getElementById('productFormId').value;
    const name = document.getElementById('productFormName').value.trim();
    const barcode = document.getElementById('productFormBarcode').value.trim();
    const categoryId = document.getElementById('productFormCategory').value;
    const price = parseFloat(document.getElementById('productFormPrice').value);
    const costPrice = parseFloat(document.getElementById('productFormCostPrice').value);
    const stockQuantity = parseInt(document.getElementById('productFormStock').value);
    const minimumLevel = parseInt(document.getElementById('productFormMinLevel').value);
    const expiryDate = document.getElementById('productFormExpiry').value;
    const imageUrl = document.getElementById('productFormImage').value.trim();

    if (!name || isNaN(price)) {
      showToast("Please provide product name and valid retail price.", "warning");
      return;
    }

    if (id) {
      // Update
      const changes = { name, barcode, categoryId, price, costPrice, stockQuantity, minimumLevel, expiryDate, imageUrl };
      if (!['admin', 'manager'].includes(state.currentUser.role)) {
        delete changes.price;
        delete changes.costPrice;
      }
      window.rsmsDB.updateProduct(parseInt(id), changes);
      showToast(`Product "${name}" updated successfully.`, "success");
    } else {
      // Add
      window.rsmsDB.addProduct({
        name, barcode, categoryId, price, costPrice, stockQuantity, minimumLevel, expiryDate, imageUrl
      });
      showToast(`Product "${name}" added to database!`, "success");
    }

    closeModal('productFormModal');
    renderProductsTable();
    updateUserBadge();

  } catch (err) {
    showToast(err.message, "error");
  }
}

function deleteProductPrompt(productId) {
  const product = window.rsmsDB.getProductById(productId);
  if (!product) return;

  if (confirm(`Are you sure you want to delete "${product.name}" (ID: #${productId})?`)) {
    window.rsmsDB.deleteProduct(productId);
    showToast(`Product "${product.name}" deleted.`, "success");
    renderProductsTable();
    updateUserBadge();
  }
}

// ================= 4. INVENTORY & STOCK ALERTS VIEW =================
// Implements Stock Clerk View, Low Stock Alerts, and Expiry Alerts
function renderInventoryView() {
  const container = document.getElementById('view-inventory');
  if (!container) return;

  const lowStock = window.rsmsDB.getLowStockProducts();
  const expiring = window.rsmsDB.getExpiringProducts(30);
  const settings = window.rsmsDB.getSettings();

  container.innerHTML = `
    <!-- Top Summary Banner -->
    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      <button class="btn btn-primary" onclick="openReceiveStockModal()">
        <i class="fas fa-truck-loading"></i> Receive Stock from Supplier
      </button>
      <button class="btn btn-secondary" onclick="openAddProductModal()">
        <i class="fas fa-plus"></i> New Product
      </button>
      <button class="btn btn-secondary" onclick="navigateTo('purchases')">
        <i class="fas fa-file-invoice"></i> View Purchase Records
      </button>
    </div>

    <!-- Low Stock Alert Table (Figure 7 & TC09) -->
    <div class="table-card" style="margin-bottom: 24px;">
      <div class="table-header" style="background: #fffbeb;">
        <div>
          <h2 style="color: #b45309;">
            <i class="fas fa-exclamation-triangle"></i> Low Stock Warning List (Stock &le; Minimum Level)
          </h2>
          <div style="font-size: 12px; color: #92400e;">
            ${lowStock.length} item(s) currently need reordering to prevent stock-outs
          </div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Minimum Level</th>
              <th>Deficit</th>
              <th>Estimated Reorder Cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${lowStock.length === 0 ? `
              <tr><td colspan="6" style="text-align:center; padding: 24px; color: #10b981;">
                <i class="fas fa-check-circle"></i> All stock levels are above minimum threshold.
              </td></tr>
            ` : lowStock.map(p => {
              const deficit = Math.max(0, p.minimumLevel - p.stockQuantity + 15);
              const reorderCost = deficit * p.costPrice;
              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center;">
                      <img src="${p.imageUrl}" alt="${p.name}" class="table-prod-thumb">
                      <div>
                        <strong>${p.name}</strong>
                        <div style="font-size: 11px; color:#64748b;">${p.barcode}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="stock-tag stock-tag-low" style="font-size:12px;">${p.stockQuantity} units</span></td>
                  <td>${p.minimumLevel} units</td>
                  <td><strong style="color: #ef4444;">+${deficit} units needed</strong></td>
                  <td>${settings.currency}${reorderCost.toFixed(2)}</td>
                  <td>
                    <button class="btn btn-success btn-sm" onclick="quickReceiveStockForProduct(${p.productId})">
                      <i class="fas fa-cart-plus"></i> Reorder Now
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Expiry Alert Table (Section 2.3 Stock Clerk requirement) -->
    <div class="table-card">
      <div class="table-header" style="background: #fef2f2;">
        <div>
          <h2 style="color: #991b1b;">
            <i class="fas fa-calendar-times"></i> Expiry Alert Monitor (Expired or Expiring within 30 days)
          </h2>
          <div style="font-size: 12px; color: #b91c1c;">
            ${expiring.length} item(s) approaching expiration date
          </div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Expiry Date</th>
              <th>Days Remaining</th>
              <th>Units in Stock</th>
              <th>Stock Value at Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${expiring.length === 0 ? `
              <tr><td colspan="6" style="text-align:center; padding: 24px; color: #10b981;">
                <i class="fas fa-check-circle"></i> No products are expired or expiring in the next 30 days.
              </td></tr>
            ` : expiring.map(p => `
              <tr>
                <td>
                  <div style="display:flex; align-items:center;">
                    <img src="${p.imageUrl}" alt="${p.name}" class="table-prod-thumb">
                    <div>
                      <strong>${p.name}</strong>
                      <div style="font-size: 11px; color:#64748b;">Barcode: ${p.barcode}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style="font-weight: 700; color: ${p.isExpired ? '#ef4444' : '#f59e0b'};">
                    ${p.expiryDate}
                  </span>
                </td>
                <td>
                  ${p.isExpired ? `
                    <span class="stock-tag stock-tag-out">EXPIRED (${Math.abs(p.daysRemaining)} days ago)</span>
                  ` : `
                    <span class="stock-tag stock-tag-low">${p.daysRemaining} days left</span>
                  `}
                </td>
                <td><strong>${p.stockQuantity} units</strong></td>
                <td>${settings.currency}${(p.stockQuantity * p.price).toFixed(2)}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${p.productId})">
                    <i class="fas fa-tag"></i> Update
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="openAdjustStockModal(${p.productId}, 'Expired')" title="Write off expired units">
                    <i class="fas fa-minus-circle"></i> Write off
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ================= 5. STOCK IN & PURCHASES VIEW =================
function renderPurchasesView() {
  const container = document.getElementById('view-purchases');
  if (!container) return;

  const purchases = window.rsmsDB.getPurchases();
  const settings = window.rsmsDB.getSettings();
  const canPay = ['admin', 'manager'].includes(state.currentUser.role);
  const totalDue = purchases.reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount || 0)), 0);

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-truck-loading text-primary"></i> Goods Received & Supplier Purchases</h2>
          <div style="font-size: 12px; color: #64748b;">
            Record of incoming shipments. Amount still to pay suppliers:
            <strong style="color: ${totalDue > 0 ? '#b91c1c' : '#15803d'};">${settings.currency}${totalDue.toFixed(2)}</strong>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openReceiveStockModal()">
          <i class="fas fa-plus"></i> Receive New Stock
        </button>
      </div>

      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Purchase ID</th>
              <th>Date & Time</th>
              <th>Supplier</th>
              <th>Product Received</th>
              <th>Quantity</th>
              <th>Cost Price</th>
              <th>Total Amount</th>
              <th>Payment</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${purchases.length === 0 ? `
              <tr><td colspan="9" style="text-align: center; padding: 24px; color: #94a3b8;">No purchases recorded yet.</td></tr>
            ` : purchases.map(pur => `
              <tr>
                <td><strong>#${pur.purchaseId}</strong><br><small style="color:#64748b;">${esc(pur.invoiceNo)}</small></td>
                <td>${pur.date}</td>
                <td><strong>${esc(pur.supplierName)}</strong></td>
                <td>${esc(pur.productName)}</td>
                <td><span class="stock-tag stock-tag-in" style="font-size:12px;">+${pur.quantity} units</span></td>
                <td>${settings.currency}${pur.costPrice.toFixed(2)}</td>
                <td><strong>${settings.currency}${pur.totalAmount.toFixed(2)}</strong></td>
                <td>
                  ${pur.paymentStatus === 'Pending' ? `
                    <span class="stock-tag stock-tag-low">Pending</span>
                    ${canPay ? `<br><button class="btn btn-success btn-sm" style="margin-top:4px;" onclick="markPurchasePaid(${pur.purchaseId})"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
                  ` : `<span class="stock-tag stock-tag-in">Paid</span>`}
                </td>
                <td><small style="color: #64748b;">${esc(pur.notes || '-')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function markPurchasePaid(purchaseId) {
  try {
    window.rsmsDB.markPurchasePaid(purchaseId);
    showToast("Supplier payment recorded.", "success");
    renderPurchasesView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Receive Stock Modal
function openReceiveStockModal(preSelectedProductId = null) {
  const modalEl = document.getElementById('receiveStockModal');
  if (!modalEl) return;

  const supplierSelect = document.getElementById('receiveSupplierSelect');
  const productSelect = document.getElementById('receiveProductSelect');

  supplierSelect.innerHTML = window.rsmsDB.getSuppliers().map(s => `
    <option value="${s.supplierId}">${s.name} (${s.contactPerson})</option>
  `).join('');

  productSelect.innerHTML = window.rsmsDB.getProducts().map(p => `
    <option value="${p.productId}" ${preSelectedProductId === p.productId ? 'selected' : ''}>
      ${p.name} (Current Stock: ${p.stockQuantity})
    </option>
  `).join('');

  // Default cost price from product
  const defaultProd = preSelectedProductId ? window.rsmsDB.getProductById(preSelectedProductId) : window.rsmsDB.getProducts()[0];
  if (defaultProd) {
    document.getElementById('receiveCostPrice').value = defaultProd.costPrice;
  }

  productSelect.onchange = (e) => {
    const prod = window.rsmsDB.getProductById(e.target.value);
    if (prod) {
      document.getElementById('receiveCostPrice').value = prod.costPrice;
    }
  };

  document.getElementById('receiveQuantity').value = '20';
  document.getElementById('receivePaymentStatus').value = 'Paid';
  document.getElementById('receiveInvoiceNo').value = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

  modalEl.classList.add('open');
}

function quickReceiveStockForProduct(productId) {
  openReceiveStockModal(productId);
}

function processReceiveStockSubmit() {
  try {
    const supplierId = parseInt(document.getElementById('receiveSupplierSelect').value);
    const productId = parseInt(document.getElementById('receiveProductSelect').value);
    const quantity = parseInt(document.getElementById('receiveQuantity').value);
    const costPrice = parseFloat(document.getElementById('receiveCostPrice').value);
    const invoiceNo = document.getElementById('receiveInvoiceNo').value.trim();
    const notes = document.getElementById('receiveNotes').value.trim();

    if (isNaN(quantity) || quantity <= 0) {
      showToast("Please enter a valid quantity greater than zero.", "warning");
      return;
    }

    const res = window.rsmsDB.receiveStock({
      supplierId,
      productId,
      quantity,
      costPrice,
      invoiceNo,
      notes,
      paymentStatus: document.getElementById('receivePaymentStatus').value
    });

    closeModal('receiveStockModal');
    showToast(`Stock updated: Received ${quantity} units of "${res.updatedProduct.name}". New Stock: ${res.updatedProduct.stockQuantity}!`, "success");

    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ================= 6. CUSTOMERS MANAGEMENT =================
function renderCustomersView() {
  const container = document.getElementById('view-customers');
  if (!container) return;

  const customers = window.rsmsDB.getCustomers();
  const sales = window.rsmsDB.getSales().filter(s => s.status !== 'Cancelled');
  const settings = window.rsmsDB.getSettings();

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-users text-primary"></i> Customer Directory & Purchase History</h2>
          <div style="font-size: 12px; color: #64748b;">Manage customer profiles and see what each customer bought</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openAddCustomerModal()">
          <i class="fas fa-user-plus"></i> Add New Customer
        </button>
      </div>

      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Total Orders</th>
              <th>Total Spent</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => {
              const customerSales = sales.filter(s => s.customerId === c.customerId);
              const totalSpent = customerSales.reduce((acc, s) => acc + s.totalAmount, 0);
              return `
                <tr>
                  <td>#${c.customerId}</td>
                  <td><strong>${esc(c.name)}</strong></td>
                  <td>${esc(c.phone)}</td>
                  <td>${esc(c.email) || '-'}</td>
                  <td>${esc(c.address) || '-'}</td>
                  <td><span class="role-badge-pill role-badge-cashier">${customerSales.length} bill(s)</span></td>
                  <td><strong>${settings.currency}${totalSpent.toFixed(2)}</strong></td>
                  <td>
                    <div style="display:flex; gap:4px;">
                      <button class="btn btn-secondary btn-sm" onclick="showCustomerHistory(${c.customerId})" title="Purchase history">
                        <i class="fas fa-history"></i>
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="openEditCustomerModal(${c.customerId})" title="Edit customer">
                        <i class="fas fa-edit"></i>
                      </button>
                      ${c.customerId !== 1 && ['admin', 'manager'].includes(state.currentUser.role) ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteCustomerPrompt(${c.customerId})" title="Delete customer">
                          <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openAddCustomerModal() {
  const modalEl = document.getElementById('customerModal');
  if (!modalEl) return;
  document.getElementById('customerFormId').value = '';
  document.getElementById('customerModalTitle').innerHTML = '<i class="fas fa-user-plus text-primary"></i> Add Customer';
  document.getElementById('customerFormName').value = '';
  document.getElementById('customerFormPhone').value = '';
  document.getElementById('customerFormEmail').value = '';
  document.getElementById('customerFormAddress').value = '';
  modalEl.classList.add('open');
}

function openEditCustomerModal(customerId) {
  const c = window.rsmsDB.getCustomerById(customerId);
  if (!c) return;
  document.getElementById('customerFormId').value = c.customerId;
  document.getElementById('customerModalTitle').innerHTML = '<i class="fas fa-user-edit text-primary"></i> Edit Customer';
  document.getElementById('customerFormName').value = c.name;
  document.getElementById('customerFormPhone').value = c.phone === 'N/A' ? '' : c.phone;
  document.getElementById('customerFormEmail').value = c.email || '';
  document.getElementById('customerFormAddress').value = c.address || '';
  document.getElementById('customerModal').classList.add('open');
}

function deleteCustomerPrompt(customerId) {
  const c = window.rsmsDB.getCustomerById(customerId);
  if (!c) return;
  if (confirm(`Delete customer "${c.name}"? Their old bills stay on record.`)) {
    try {
      window.rsmsDB.deleteCustomer(customerId);
      showToast("Customer deleted.", "success");
      renderCustomersView();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

function openQuickAddCustomerModal() {
  openAddCustomerModal();
}

function saveCustomerForm() {
  const name = document.getElementById('customerFormName').value.trim();
  const phone = document.getElementById('customerFormPhone').value.trim();
  const email = document.getElementById('customerFormEmail').value.trim();
  const address = document.getElementById('customerFormAddress').value.trim();

  if (!name) {
    showToast("Customer name is required.", "warning");
    return;
  }

  const editId = document.getElementById('customerFormId').value;
  if (editId) {
    window.rsmsDB.updateCustomer(parseInt(editId), { name, phone, email, address });
    showToast(`Customer "${name}" updated.`, "success");
    closeModal('customerModal');
    renderCustomersView();
    return;
  }

  const newCust = window.rsmsDB.addCustomer({ name, phone, email, address });
  showToast(`Customer "${newCust.name}" added successfully.`, "success");
  closeModal('customerModal');

  if (state.activeView === 'pos') {
    state.pos.selectedCustomer = newCust.customerId;
    renderPOS();
  } else {
    renderCustomersView();
  }
}

function showCustomerHistory(customerId) {
  const customer = window.rsmsDB.getCustomerById(customerId);
  if (!customer) return;
  const sales = window.rsmsDB.getSales().filter(s => s.customerId === customerId);
  const settings = window.rsmsDB.getSettings();
  const valid = sales.filter(s => s.status !== 'Cancelled');
  const total = valid.reduce((sum, s) => sum + s.totalAmount, 0);

  document.getElementById('historyModalTitle').innerHTML =
    `<i class="fas fa-history text-primary"></i> Purchase History: ${esc(customer.name)}`;
  document.getElementById('historyModalBody').innerHTML = sales.length === 0
    ? '<p style="color:#94a3b8; text-align:center; padding: 20px;">No purchases recorded for this customer yet.</p>'
    : `
      <div style="margin-bottom: 10px; font-size: 13px; color: #475569;">
        ${valid.length} bill(s), total spent <strong>${settings.currency}${total.toFixed(2)}</strong>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr><th>Bill No</th><th>Date</th><th>Items</th><th>Payment</th><th>Total</th><th></th></tr></thead>
          <tbody>
            ${sales.map(s => `
              <tr>
                <td><strong>${s.billNo}</strong>${s.status === 'Cancelled' ? ' <span class="stock-tag stock-tag-out">Cancelled</span>' : ''}</td>
                <td>${s.date}</td>
                <td style="font-size:12px;">${s.items.map(i => `${esc(i.productName)} x${i.quantity}`).join(', ')}</td>
                <td>${s.paymentMode}</td>
                <td><strong>${settings.currency}${s.totalAmount.toFixed(2)}</strong></td>
                <td><button class="btn btn-secondary btn-sm" onclick="closeModal('historyModal'); viewReceipt('${s.billNo}')"><i class="fas fa-receipt"></i></button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  document.getElementById('historyModal').classList.add('open');
}

// ================= 7. SUPPLIERS MANAGEMENT =================
function renderSuppliersView() {
  const container = document.getElementById('view-suppliers');
  if (!container) return;

  const suppliers = window.rsmsDB.getSuppliers();
  const purchases = window.rsmsDB.getPurchases();
  const settings = window.rsmsDB.getSettings();
  const canManage = ['admin', 'manager'].includes(state.currentUser.role);

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-truck text-primary"></i> Suppliers Directory</h2>
          <div style="font-size: 12px; color: #64748b;">Suppliers providing goods and inventory</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openAddSupplierModal()">
          <i class="fas fa-plus"></i> Add New Supplier
        </button>
      </div>

      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Supplier ID</th>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Total Orders</th>
              <th>Amount Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(s => {
              const suppPurchases = purchases.filter(p => p.supplierId === s.supplierId);
              const totalAmount = suppPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
              const due = window.rsmsDB.getSupplierDue(s.supplierId);
              return `
                <tr>
                  <td>#${s.supplierId}</td>
                  <td><strong>${esc(s.name)}</strong></td>
                  <td>${esc(s.contactPerson)}</td>
                  <td>${esc(s.phone)}</td>
                  <td>${esc(s.email)}</td>
                  <td>${esc(s.address)}</td>
                  <td>${suppPurchases.length} (${settings.currency}${totalAmount.toFixed(0)})</td>
                  <td>${due > 0
                    ? `<span class="stock-tag stock-tag-low">${settings.currency}${due.toFixed(2)} due</span>`
                    : '<span class="stock-tag stock-tag-in">Settled</span>'}</td>
                  <td>
                    <div style="display:flex; gap:4px;">
                      <button class="btn btn-success btn-sm" onclick="openReceiveStockModal()" title="Receive stock">
                        <i class="fas fa-truck-loading"></i>
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="openEditSupplierModal(${s.supplierId})" title="Edit supplier">
                        <i class="fas fa-edit"></i>
                      </button>
                      ${canManage ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteSupplierPrompt(${s.supplierId})" title="Delete supplier">
                          <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openAddSupplierModal() {
  const modalEl = document.getElementById('supplierModal');
  if (!modalEl) return;
  document.getElementById('supplierFormId').value = '';
  document.getElementById('supplierModalTitle').innerHTML = '<i class="fas fa-truck text-primary"></i> Add New Supplier';
  document.getElementById('supplierFormName').value = '';
  document.getElementById('supplierFormContact').value = '';
  document.getElementById('supplierFormPhone').value = '';
  document.getElementById('supplierFormEmail').value = '';
  document.getElementById('supplierFormAddress').value = '';
  modalEl.classList.add('open');
}

function openEditSupplierModal(supplierId) {
  const sp = window.rsmsDB.getSupplierById(supplierId);
  if (!sp) return;
  document.getElementById('supplierFormId').value = sp.supplierId;
  document.getElementById('supplierModalTitle').innerHTML = '<i class="fas fa-edit text-primary"></i> Edit Supplier';
  document.getElementById('supplierFormName').value = sp.name;
  document.getElementById('supplierFormContact').value = sp.contactPerson || '';
  document.getElementById('supplierFormPhone').value = sp.phone;
  document.getElementById('supplierFormEmail').value = sp.email || '';
  document.getElementById('supplierFormAddress').value = sp.address || '';
  document.getElementById('supplierModal').classList.add('open');
}

function deleteSupplierPrompt(supplierId) {
  const sp = window.rsmsDB.getSupplierById(supplierId);
  if (!sp) return;
  if (confirm(`Delete supplier "${sp.name}"? Past purchase records stay on file.`)) {
    try {
      window.rsmsDB.deleteSupplier(supplierId);
      showToast("Supplier deleted.", "success");
      renderSuppliersView();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

function saveSupplierForm() {
  const name = document.getElementById('supplierFormName').value.trim();
  const contactPerson = document.getElementById('supplierFormContact').value.trim();
  const phone = document.getElementById('supplierFormPhone').value.trim();
  const email = document.getElementById('supplierFormEmail').value.trim();
  const address = document.getElementById('supplierFormAddress').value.trim();

  if (!name || !phone) {
    showToast("Supplier name and phone are required.", "warning");
    return;
  }

  const editId = document.getElementById('supplierFormId').value;
  if (editId) {
    window.rsmsDB.updateSupplier(parseInt(editId), { name, contactPerson, phone, email, address });
    showToast(`Supplier "${name}" updated.`, "success");
  } else {
    window.rsmsDB.addSupplier({ name, contactPerson, phone, email, address });
    showToast(`Supplier "${name}" added.`, "success");
  }
  closeModal('supplierModal');
  renderSuppliersView();
}

// ================= 8. REPORTS & ANALYTICS (MANAGER & OWNER) =================
// Fulfills Manager/Owner Requirements (Daily, Weekly, Monthly sales report TC11, Profit & Stock valuation)
function renderReportsView(selectedPeriod = 'all') {
  const container = document.getElementById('view-reports');
  if (!container) return;

  const isManagerOrAdmin = ['admin', 'manager'].includes(state.currentUser.role);
  if (!isManagerOrAdmin) {
    showToast("Access Denied: Reports are restricted to Store Manager and Administrator.", "error");
    navigateTo('dashboard');
    return;
  }

  const report = window.rsmsDB.getSalesReport({ period: selectedPeriod });
  const settings = window.rsmsDB.getSettings();

  container.innerHTML = `
    <!-- Period Filters -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; gap: 8px;">
        <button class="btn ${selectedPeriod === 'today' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="renderReportsView('today')">
          <i class="fas fa-calendar-day"></i> Today
        </button>
        <button class="btn ${selectedPeriod === 'week' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="renderReportsView('week')">
          <i class="fas fa-calendar-week"></i> Past 7 Days
        </button>
        <button class="btn ${selectedPeriod === 'month' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="renderReportsView('month')">
          <i class="fas fa-calendar-alt"></i> This Month
        </button>
        <button class="btn ${selectedPeriod === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="renderReportsView('all')">
          <i class="fas fa-infinity"></i> All Time
        </button>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          <i class="fas fa-print"></i> Print Report
        </button>
        <button class="btn btn-secondary btn-sm" onclick="exportSalesReportCSV()">
          <i class="fas fa-download"></i> Export CSV
        </button>
      </div>
    </div>

    <!-- Financial Analytics Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <h3>Total Revenue</h3>
          <div class="stat-number">${settings.currency}${report.totalRevenue.toFixed(2)}</div>
          <div class="stat-trend trend-up"><i class="fas fa-shopping-cart"></i> ${report.totalBills} completed bill(s)</div>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-chart-line"></i></div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <h3>Cost of Goods Sold (COGS)</h3>
          <div class="stat-number">${settings.currency}${report.totalCOGS.toFixed(2)}</div>
          <div class="stat-trend"><i class="fas fa-boxes"></i> Wholesale cost basis</div>
        </div>
        <div class="stat-icon stat-icon-amber"><i class="fas fa-coins"></i></div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <h3>Gross Profit</h3>
          <div class="stat-number" style="color: #10b981;">${settings.currency}${report.grossProfit.toFixed(2)}</div>
          <div class="stat-trend trend-up"><i class="fas fa-percentage"></i> Margin: ${report.profitMargin}%</div>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-hand-holding-usd"></i></div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <h3>Current Stock Valuation</h3>
          <div class="stat-number">${settings.currency}${report.inventoryValuation.retailValue.toFixed(0)}</div>
          <div class="stat-trend"><i class="fas fa-warehouse"></i> Cost: ${settings.currency}${report.inventoryValuation.costValue.toFixed(0)}</div>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-store"></i></div>
      </div>
    </div>

    <!-- Visual Interactive Analytics Charts Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
      <!-- Category Sales Breakdown -->
      <div class="table-card">
        <div class="table-header">
          <h2><i class="fas fa-chart-pie text-primary"></i> Revenue by Product Category</h2>
        </div>
        <div style="padding: 20px;">
          ${Object.keys(report.categorySalesMap).length === 0 ? '<p style="color:#94a3b8;">No data for period.</p>' : ''}
          ${Object.entries(report.categorySalesMap).map(([catName, amount]) => {
            const pct = report.totalRevenue > 0 ? ((amount / report.totalRevenue) * 100).toFixed(1) : 0;
            return `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                  <span>${catName}</span>
                  <span>${settings.currency}${amount.toFixed(2)} (${pct}%)</span>
                </div>
                <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: #2563eb; border-radius: 4px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Payment Modes Breakdown -->
      <div class="table-card">
        <div class="table-header">
          <h2><i class="fas fa-credit-card text-success"></i> Payment Methods Breakdown</h2>
        </div>
        <div style="padding: 20px;">
          ${['UPI', 'Cash', 'Card'].map(mode => {
            const amt = report.paymentModeMap[mode] || 0;
            const pct = report.totalRevenue > 0 ? ((amt / report.totalRevenue) * 100).toFixed(1) : 0;
            const iconMap = { Cash: 'fa-money-bill-wave text-success', Card: 'fa-credit-card text-blue', UPI: 'fa-qrcode text-purple' };
            return `
              <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                  <span><i class="fas ${iconMap[mode]}"></i> ${mode}</span>
                  <span>${settings.currency}${amt.toFixed(2)} (${pct}%)</span>
                </div>
                <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: #10b981; border-radius: 4px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Top Selling Products Leaderboard -->
    <div class="table-card">
      <div class="table-header">
        <h2><i class="fas fa-trophy text-warning"></i> Top Performing Products</h2>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product Name</th>
              <th>Units Sold</th>
              <th>Total Revenue</th>
              <th>Gross Profit Contribution</th>
            </tr>
          </thead>
          <tbody>
            ${report.topSellingProducts.length === 0 ? `
              <tr><td colspan="5" style="text-align:center; padding: 20px; color:#94a3b8;">No sales recorded for this period.</td></tr>
            ` : report.topSellingProducts.map((p, idx) => `
              <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><strong>${p.name}</strong></td>
                <td><span class="role-badge-pill role-badge-cashier">${p.quantity} units</span></td>
                <td>${settings.currency}${p.revenue.toFixed(2)}</td>
                <td><strong style="color: #10b981;">${settings.currency}${p.profit.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ================= 9. USER MANAGEMENT (ADMINISTRATOR) =================
// Fulfills Administrator Requirements & TC12
function renderUsersView() {
  const container = document.getElementById('view-users');
  if (!container) return;

  if (state.currentUser.role !== 'admin') {
    showToast("Access Denied: Only Administrator can manage user accounts.", "error");
    navigateTo('dashboard');
    return;
  }

  const users = window.rsmsDB.getUsers();

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-user-shield text-danger"></i> System User Accounts & Roles (RBAC)</h2>
          <div style="font-size: 12px; color: #64748b;">Manage Cashiers, Stock Clerks, Managers, and Admins</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">
          <i class="fas fa-user-plus"></i> Add New User
        </button>
      </div>

      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Full Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>#${u.userId}</td>
                <td><strong>${u.name}</strong></td>
                <td><code style="font-family: monospace;">${u.username}</code></td>
                <td><span class="role-badge-pill role-badge-${u.role}">${formatRole(u.role)}</span></td>
                <td><span class="stock-tag stock-tag-in">${u.status}</span></td>
                <td>${u.createdAt}</td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <select class="form-control" style="width: auto; padding: 4px 8px; font-size: 12px;" onchange="changeUserRolePrompt(${u.userId}, this.value)">
                      <option value="cashier" ${u.role === 'cashier' ? 'selected' : ''}>Cashier</option>
                      <option value="stock_clerk" ${u.role === 'stock_clerk' ? 'selected' : ''}>Stock Clerk</option>
                      <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    ${u.username !== 'admin' ? `
                      <button class="btn btn-danger btn-sm" onclick="deleteUserPrompt(${u.userId})" title="Delete User">
                        <i class="fas fa-trash"></i>
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openAddUserModal() {
  const modalEl = document.getElementById('userModal');
  if (!modalEl) return;
  document.getElementById('userFormName').value = '';
  document.getElementById('userFormUsername').value = '';
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormRole').value = 'cashier';
  modalEl.classList.add('open');
}

function saveUserForm() {
  try {
    const name = document.getElementById('userFormName').value.trim();
    const username = document.getElementById('userFormUsername').value.trim();
    const password = document.getElementById('userFormPassword').value.trim();
    const role = document.getElementById('userFormRole').value;

    if (!name || !username || !password) {
      showToast("All fields are required.", "warning");
      return;
    }

    window.rsmsDB.addUser({ name, username, password, role });
    showToast(`User account "${username}" created successfully.`, "success");
    closeModal('userModal');
    renderUsersView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function changeUserRolePrompt(userId, newRole) {
  try {
    window.rsmsDB.updateUserRole(userId, newRole);
    showToast(`User role updated to ${formatRole(newRole)}.`, "success");
    renderUsersView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function deleteUserPrompt(userId) {
  if (confirm("Are you sure you want to remove this user account?")) {
    try {
      window.rsmsDB.deleteUser(userId);
      showToast("User removed successfully.", "success");
      renderUsersView();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

// ================= 10. SYSTEM SETTINGS & DATABASE BACKUP =================
// Fulfills Requirements: "Take backup of the data" & "Manage system settings"
function renderSettingsView() {
  const container = document.getElementById('view-settings');
  if (!container) return;

  const settings = window.rsmsDB.getSettings();

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Store Settings Form -->
      <div class="table-card">
        <div class="table-header">
          <h2><i class="fas fa-store text-primary"></i> Retail Store Profile</h2>
        </div>
        <div style="padding: 20px;">
          <div class="form-group">
            <label class="form-label">Store Name</label>
            <input type="text" id="setStoreName" class="form-control" value="${settings.storeName}">
          </div>
          <div class="form-group">
            <label class="form-label">Store Tagline / Subtitle</label>
            <input type="text" id="setStoreTagline" class="form-control" value="${settings.tagline}">
          </div>
          <div class="form-group">
            <label class="form-label">Store Address</label>
            <textarea id="setStoreAddress" class="form-control" rows="2">${settings.address}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" id="setStorePhone" class="form-control" value="${settings.phone}">
            </div>
            <div class="form-group">
              <label class="form-label">GSTIN / Tax Registration</label>
              <input type="text" id="setStoreGSTIN" class="form-control" value="${settings.gstin}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Default Tax Rate (%)</label>
              <input type="number" id="setStoreTax" class="form-control" step="0.5" value="${settings.taxRate}">
            </div>
            <div class="form-group">
              <label class="form-label">Currency Symbol</label>
              <input type="text" id="setStoreCurrency" class="form-control" value="${settings.currency}">
            </div>
          </div>
          <button class="btn btn-primary" onclick="saveStoreSettings()">
            <i class="fas fa-save"></i> Save Store Settings
          </button>
        </div>
      </div>

      <!-- Database Backup & Restore (Software Eng. Specification Table 4.5 & Figure 1) -->
      <div class="table-card">
        <div class="table-header">
          <h2><i class="fas fa-database text-warning"></i> Database Backup & Portability</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
            This web application features an in-browser Relational Database with full persistence in localStorage/IndexedDB. You can export complete backups, restore them on any computer without installing servers, or reset to initial sample demo data.
          </p>

          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #0f172a;">
              <i class="fas fa-download text-primary"></i> 1. Export Database Backup
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
              Downloads a complete JSON snapshot of all products, stock, sales, bills, users, customers, and purchases.
            </p>
            <button class="btn btn-primary btn-sm" onclick="downloadDatabaseBackup()">
              <i class="fas fa-download"></i> Download Database (.json)
            </button>
          </div>

          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #0f172a;">
              <i class="fas fa-upload text-success"></i> 2. Restore Database from Backup
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
              Select a previously exported JSON backup file to restore all store data.
            </p>
            <input type="file" id="dbRestoreFileInput" accept=".json" style="font-size: 12px; margin-bottom: 10px;" onchange="handleDatabaseRestore(this)">
          </div>

          <div style="border-top: 1px dashed #cbd5e1; padding-top: 16px;">
            <div style="font-weight: 700; font-size: 13px; color: #991b1b; margin-bottom: 6px;">
              <i class="fas fa-undo"></i> Reset to Factory Demo Data
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
              Restores initial seed catalog with 18 products, sample sales, suppliers, and default user accounts.
            </p>
            <button class="btn btn-danger btn-sm" onclick="resetDatabasePrompt()">
              <i class="fas fa-history"></i> Reset Demo Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveStoreSettings() {
  const storeName = document.getElementById('setStoreName').value.trim();
  const tagline = document.getElementById('setStoreTagline').value.trim();
  const address = document.getElementById('setStoreAddress').value.trim();
  const phone = document.getElementById('setStorePhone').value.trim();
  const gstin = document.getElementById('setStoreGSTIN').value.trim();
  const taxRate = parseFloat(document.getElementById('setStoreTax').value) || 5.0;
  const currency = document.getElementById('setStoreCurrency').value.trim() || '₹';

  window.rsmsDB.updateSettings({ storeName, tagline, address, phone, gstin, taxRate, currency });
  showToast("Store settings saved successfully.", "success");
  renderApp();
}

function downloadDatabaseBackup() {
  const json = window.rsmsDB.exportBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retail_store_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Database backup downloaded successfully.", "success");
}

function handleDatabaseRestore(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const res = window.rsmsDB.importBackup(e.target.result);
    if (res.success) {
      showToast(res.message, "success");
      renderApp();
    } else {
      showToast(res.message, "error");
    }
  };
  reader.readAsText(file);
}

function resetDatabasePrompt() {
  if (confirm("Reset database to initial demo state? This will restore sample products, users, and sales.")) {
    window.rsmsDB.resetToDefaults();
    showToast("Database reset to factory demo data.", "success");
    renderApp();
  }
}

// ================= MODAL HELPERS =================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// ================= CSV EXPORTERS =================
function exportProductsCSV() {
  const products = window.rsmsDB.getProducts();
  const headers = "Product_ID,Name,Category_ID,Barcode,Cost_Price,Price,Stock_Quantity,Minimum_Level,Expiry_Date\n";
  const rows = products.map(p => `"${p.productId}","${p.name}","${p.categoryId}","${p.barcode}",${p.costPrice},${p.price},${p.stockQuantity},${p.minimumLevel},"${p.expiryDate}"`).join('\n');
  downloadCSV(headers + rows, 'products_catalog.csv');
}

function exportSalesReportCSV() {
  const sales = window.rsmsDB.getSales();
  const headers = "Bill_No,Date,Customer,Cashier,Payment_Mode,Subtotal,Tax,Discount,Total\n";
  const rows = sales.map(s => `"${s.billNo}","${s.date}","${s.customerName}","${s.cashierName}","${s.paymentMode}",${s.subtotal},${s.taxAmount},${s.discountAmount},${s.totalAmount}`).join('\n');
  downloadCSV(headers + rows, 'sales_report.csv');
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${filename}`, "success");
}

// ================= TOAST NOTIFICATION UTILITY =================
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


// =====================================================================
// NEW IN THIS VERSION: login, sales history, categories, activity log,
// stock adjustment, change password, auto-logout
// =====================================================================

// Makes user-typed text safe to show inside the page
function esc(value) {
  return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// ================= LOGIN / LOGOUT =================
const IDLE_LIMIT_MS = 15 * 60 * 1000; // auto-logout after 15 minutes of no activity
let lastActivityTime = Date.now();
let idleTimer = null;

['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, () => { lastActivityTime = Date.now(); }, { passive: true });
});

function initAuth() {
  // Keep the person signed in if they only refreshed the page
  try {
    const saved = JSON.parse(sessionStorage.getItem('rsms_session') || 'null');
    if (saved) {
      const dbUser = window.rsmsDB.getUsers().find(u => u.userId === saved.userId && u.status === 'active');
      if (dbUser) {
        state.currentUser = { userId: dbUser.userId, name: dbUser.name, username: dbUser.username, role: dbUser.role };
        window.rsmsDB.actor = dbUser.name;
        startSession(false);
        return;
      }
    }
  } catch (e) { /* ignore and show login */ }
  showLoginScreen();
}

function showLoginScreen(message) {
  const screen = document.getElementById('loginScreen');
  if (screen) screen.classList.remove('hidden');
  const err = document.getElementById('loginError');
  if (err) {
    err.style.display = message ? 'block' : 'none';
    err.textContent = message || '';
  }
  const pw = document.getElementById('loginPassword');
  if (pw) pw.value = '';
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');

  if (!username || !password) {
    err.style.display = 'block';
    err.textContent = 'Please enter both username and password.';
    return;
  }

  const result = window.rsmsDB.login(username, password);
  if (!result.success) {
    err.style.display = 'block';
    err.textContent = result.message;
    return;
  }

  state.currentUser = result.user;
  sessionStorage.setItem('rsms_session', JSON.stringify(result.user));
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  startSession(true);
}

function startSession(showWelcome) {
  document.getElementById('loginScreen').classList.add('hidden');
  applyRoleMenu();

  const allowed = ROLE_PERMISSIONS[state.currentUser.role] || ['dashboard'];
  const startView = allowed.includes(state.activeView) ? state.activeView : 'dashboard';
  navigateTo(startView);
  updateUserBadge();

  lastActivityTime = Date.now();
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (state.currentUser && Date.now() - lastActivityTime > IDLE_LIMIT_MS) {
      logout('You were signed out after 15 minutes of inactivity.');
    }
  }, 30000);

  if (showWelcome) showToast(`Welcome, ${state.currentUser.name} (${formatRole(state.currentUser.role)})`, 'success');
}

function logout(message) {
  if (state.currentUser) window.rsmsDB.logActivity('Logout', `${state.currentUser.name} signed out`);
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
  sessionStorage.removeItem('rsms_session');
  state.currentUser = null;
  window.rsmsDB.actor = null;
  state.pos.cart = [];
  state.pos.discount = 0;
  state.pos.selectedCustomer = 1;
  state.activeView = 'dashboard';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  showLoginScreen(typeof message === 'string' ? message : '');
}

// Shows only the menu items the signed-in role is allowed to open
function applyRoleMenu() {
  const allowed = ROLE_PERMISSIONS[state.currentUser.role] || [];
  const items = Array.from(document.querySelectorAll('.nav-menu > *'));
  let currentTitle = null;
  let visibleInSection = 0;
  items.forEach(el => {
    if (el.classList.contains('nav-section-title')) {
      if (currentTitle) currentTitle.style.display = visibleInSection ? '' : 'none';
      currentTitle = el;
      visibleInSection = 0;
    } else {
      const link = el.querySelector('.nav-link[data-view]');
      const ok = link && allowed.includes(link.getAttribute('data-view'));
      el.style.display = ok ? '' : 'none';
      if (ok) visibleInSection++;
    }
  });
  if (currentTitle) currentTitle.style.display = visibleInSection ? '' : 'none';
}

// ================= CHANGE PASSWORD =================
function openChangePasswordModal() {
  ['pwOld', 'pwNew', 'pwConfirm'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('passwordModal').classList.add('open');
}

function saveNewPassword() {
  const oldPw = document.getElementById('pwOld').value;
  const newPw = document.getElementById('pwNew').value;
  const confirmPw = document.getElementById('pwConfirm').value;
  if (newPw !== confirmPw) {
    showToast("New password and confirmation do not match.", "warning");
    return;
  }
  try {
    window.rsmsDB.changePassword(state.currentUser.userId, oldPw, newPw);
    closeModal('passwordModal');
    showToast("Password updated.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ================= POS: attach search / discount / barcode events =================
// (These elements are created each time the POS page is drawn, so they are attached here.)
function bindPOSEvents() {
  const posSearch = document.getElementById('posSearchInput');
  if (posSearch) {
    posSearch.addEventListener('input', (e) => {
      state.pos.searchQuery = e.target.value;
      renderPOSProducts();
    });
    posSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = posSearch.value.trim();
        if (!query) return;
        const product = window.rsmsDB.getProductByBarcode(query) || window.rsmsDB.searchProducts(query)[0];
        if (product) {
          addToCart(product.productId);
          posSearch.value = '';
          state.pos.searchQuery = '';
          renderPOSProducts();
        } else {
          showToast(`No product found for "${query}".`, "warning");
        }
      }
    });
  }

  const discountInput = document.getElementById('posDiscountInput');
  if (discountInput) {
    discountInput.addEventListener('input', (e) => {
      state.pos.discount = Math.max(0, parseFloat(e.target.value) || 0);
      updateCartTotals();
    });
  }
}

// ================= DASHBOARD: 7-day sales trend =================
function buildSalesTrendHTML() {
  const settings = window.rsmsDB.getSettings();
  const sales = window.rsmsDB.getSales().filter(s => s.status !== 'Cancelled');
  const pad = n => String(n).padStart(2, '0');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      total: 0
    });
  }
  sales.forEach(s => {
    const day = days.find(d => s.date.startsWith(d.key));
    if (day) day.total += s.totalAmount;
  });
  const max = Math.max(...days.map(d => d.total), 1);

  return `
    <div class="table-card" style="margin-bottom: 20px;">
      <div class="table-header">
        <h2><i class="fas fa-chart-column text-primary"></i> Sales Trend (Last 7 Days)</h2>
      </div>
      <div class="trend-chart">
        ${days.map(d => `
          <div class="trend-col">
            <div class="trend-value">${d.total ? settings.currency + Math.round(d.total) : ''}</div>
            <div class="trend-bar" style="height: ${Math.max(d.total ? 4 : 0, Math.round((d.total / max) * 100))}%;"></div>
            <div class="trend-label">${d.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ================= SALES HISTORY =================
function renderSalesView() {
  const container = document.getElementById('view-sales');
  if (!container) return;

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-receipt text-primary"></i> Sales History & Bill Records</h2>
          <div id="salesSummaryLine" style="font-size: 12px; color: #64748b;"></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="exportSalesReportCSV()">
          <i class="fas fa-download"></i> Export CSV
        </button>
      </div>

      <div style="padding: 12px 20px; background: #fafbfc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
        <input type="text" id="salesFilterText" class="form-control" style="max-width: 240px;" placeholder="Search bill no, customer or cashier..." oninput="renderSalesRows()">
        <label style="font-size: 12px; color: #64748b;">From <input type="date" id="salesFilterFrom" class="form-control" style="display:inline-block; width:auto;" onchange="renderSalesRows()"></label>
        <label style="font-size: 12px; color: #64748b;">To <input type="date" id="salesFilterTo" class="form-control" style="display:inline-block; width:auto;" onchange="renderSalesRows()"></label>
        <select id="salesFilterStatus" class="form-control" style="max-width: 160px;" onchange="renderSalesRows()">
          <option value="all">All bills</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Items</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="salesTableBody"></tbody>
        </table>
      </div>
    </div>
  `;
  renderSalesRows();
}

function renderSalesRows() {
  const body = document.getElementById('salesTableBody');
  if (!body) return;
  const settings = window.rsmsDB.getSettings();
  const canCancel = ['admin', 'manager'].includes(state.currentUser.role);

  const text = (document.getElementById('salesFilterText').value || '').toLowerCase().trim();
  const from = document.getElementById('salesFilterFrom').value;
  const to = document.getElementById('salesFilterTo').value;
  const status = document.getElementById('salesFilterStatus').value;

  const list = window.rsmsDB.getSales().filter(s => {
    if (status !== 'all' && s.status !== status) return false;
    const day = s.date.split(' ')[0];
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (text) {
      const hay = `${s.billNo} ${s.customerName} ${s.cashierName}`.toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });

  const valid = list.filter(s => s.status !== 'Cancelled');
  const total = valid.reduce((sum, s) => sum + s.totalAmount, 0);
  document.getElementById('salesSummaryLine').textContent =
    `${list.length} bill(s) shown, sales value ${settings.currency}${total.toFixed(2)} (cancelled bills not counted). Saved bills cannot be edited.`;

  body.innerHTML = list.length === 0
    ? '<tr><td colspan="9" style="text-align:center; padding: 24px; color:#94a3b8;">No bills match your search.</td></tr>'
    : list.map(s => `
      <tr>
        <td><strong>${s.billNo}</strong></td>
        <td>${s.date}</td>
        <td>${esc(s.customerName)}</td>
        <td>${esc(s.cashierName)}</td>
        <td>${s.items.reduce((n, i) => n + i.quantity, 0)}</td>
        <td>${s.paymentMode}</td>
        <td><strong>${settings.currency}${s.totalAmount.toFixed(2)}</strong></td>
        <td>${s.status === 'Cancelled'
          ? `<span class="stock-tag stock-tag-out" title="${esc(s.cancelReason || '')}">Cancelled</span>`
          : '<span class="stock-tag stock-tag-in">Completed</span>'}</td>
        <td>
          <div style="display:flex; gap:4px;">
            <button class="btn btn-secondary btn-sm" onclick="viewReceipt('${s.billNo}')" title="View / reprint bill">
              <i class="fas fa-print"></i>
            </button>
            ${canCancel && s.status !== 'Cancelled' ? `
              <button class="btn btn-danger btn-sm" onclick="cancelSavedBill(${s.saleId})" title="Cancel this bill and return stock">
                <i class="fas fa-ban"></i>
              </button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
}

function cancelSavedBill(saleId) {
  const sale = window.rsmsDB.getSaleById(saleId);
  if (!sale) return;
  const reason = prompt(`Cancel bill ${sale.billNo}? The items will go back into stock.\n\nReason for cancelling:`);
  if (reason === null) return;
  if (!reason.trim()) {
    showToast("Please enter a reason to cancel a bill.", "warning");
    return;
  }
  try {
    window.rsmsDB.voidSale(saleId, reason.trim());
    showToast(`Bill ${sale.billNo} cancelled and stock returned.`, "success");
    renderSalesRows();
    updateUserBadge();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ================= CATEGORIES =================
function renderCategoriesView() {
  const container = document.getElementById('view-categories');
  if (!container) return;

  const categories = window.rsmsDB.getCategories();
  const products = window.rsmsDB.getProducts();

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-tags text-info"></i> Product Categories</h2>
          <div style="font-size: 12px; color: #64748b;">${categories.length} categories</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openCategoryModal()">
          <i class="fas fa-plus"></i> Add Category
        </button>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr><th>Category</th><th>Description</th><th>Products</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${categories.map(c => {
              const count = products.filter(p => p.categoryId === c.categoryId).length;
              return `
                <tr>
                  <td>
                    <span style="display:inline-flex; align-items:center; gap:10px;">
                      <span style="width:32px; height:32px; border-radius:8px; background:${esc(c.color)}22; color:${esc(c.color)}; display:inline-flex; align-items:center; justify-content:center;">
                        <i class="fas ${esc(c.icon)}"></i>
                      </span>
                      <strong>${esc(c.name)}</strong>
                    </span>
                  </td>
                  <td>${esc(c.description) || '-'}</td>
                  <td><span class="role-badge-pill role-badge-cashier">${count} product(s)</span></td>
                  <td>
                    <div style="display:flex; gap:4px;">
                      <button class="btn btn-secondary btn-sm" onclick="openCategoryModal(${c.categoryId})" title="Edit"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-danger btn-sm" onclick="deleteCategoryPrompt(${c.categoryId})" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openCategoryModal(categoryId) {
  const cat = categoryId ? window.rsmsDB.getCategoryById(categoryId) : null;
  document.getElementById('categoryFormId').value = cat ? cat.categoryId : '';
  document.getElementById('categoryModalTitle').innerHTML = cat
    ? '<i class="fas fa-edit text-primary"></i> Edit Category'
    : '<i class="fas fa-tags text-primary"></i> Add Category';
  document.getElementById('categoryFormName').value = cat ? cat.name : '';
  document.getElementById('categoryFormDesc').value = cat ? cat.description : '';
  document.getElementById('categoryFormColor').value = cat ? cat.color : '#2563eb';
  const iconSel = document.getElementById('categoryFormIcon');
  if (cat && ![...iconSel.options].some(o => o.value === cat.icon)) {
    iconSel.add(new Option('Current icon', cat.icon));
  }
  iconSel.value = cat ? cat.icon : 'fa-box';
  document.getElementById('categoryModal').classList.add('open');
}

function saveCategoryForm() {
  const id = document.getElementById('categoryFormId').value;
  const data = {
    name: document.getElementById('categoryFormName').value,
    description: document.getElementById('categoryFormDesc').value.trim(),
    icon: document.getElementById('categoryFormIcon').value,
    color: document.getElementById('categoryFormColor').value
  };
  try {
    if (id) {
      window.rsmsDB.updateCategory(parseInt(id), data);
      showToast("Category updated.", "success");
    } else {
      window.rsmsDB.addCategory(data);
      showToast("Category added.", "success");
    }
    closeModal('categoryModal');
    renderCategoriesView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function deleteCategoryPrompt(categoryId) {
  const cat = window.rsmsDB.getCategoryById(categoryId);
  if (!cat) return;
  if (confirm(`Delete category "${cat.name}"?`)) {
    try {
      window.rsmsDB.deleteCategory(categoryId);
      showToast("Category deleted.", "success");
      renderCategoriesView();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

// ================= STOCK ADJUSTMENT (damaged / expired / wasted) =================
function openAdjustStockModal(productId, defaultReason) {
  const product = window.rsmsDB.getProductById(productId);
  if (!product) return;
  document.getElementById('adjustProductId').value = product.productId;
  document.getElementById('adjustProductName').textContent = `${product.name} (in stock: ${product.stockQuantity})`;
  document.getElementById('adjustQuantity').value = 1;
  document.getElementById('adjustQuantity').max = product.stockQuantity;
  document.getElementById('adjustReason').value = defaultReason || 'Damaged';
  document.getElementById('adjustNote').value = '';
  document.getElementById('adjustStockModal').classList.add('open');
}

function saveStockAdjustment() {
  try {
    const productId = parseInt(document.getElementById('adjustProductId').value);
    const qty = parseInt(document.getElementById('adjustQuantity').value);
    const reason = document.getElementById('adjustReason').value;
    const note = document.getElementById('adjustNote').value.trim();
    const product = window.rsmsDB.adjustStock(productId, qty, reason, note);
    closeModal('adjustStockModal');
    showToast(`Removed ${qty} unit(s) of "${product.name}" (${reason}). Stock now ${product.stockQuantity}.`, "success");
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ================= ACTIVITY LOG =================
function renderActivityView() {
  const container = document.getElementById('view-activity');
  if (!container) return;
  const log = window.rsmsDB.getActivityLog();

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h2><i class="fas fa-clock-rotate-left text-secondary"></i> Activity Log</h2>
          <div style="font-size: 12px; color: #64748b;">Who did what and when (latest 300 actions)</div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            ${log.length === 0
              ? '<tr><td colspan="4" style="text-align:center; padding:24px; color:#94a3b8;">No activity recorded yet.</td></tr>'
              : log.map(e => `
                <tr>
                  <td style="white-space:nowrap;">${esc(e.time)}</td>
                  <td>${esc(e.user)}</td>
                  <td><span class="role-badge-pill role-badge-cashier">${esc(e.action)}</span></td>
                  <td>${esc(e.details)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
