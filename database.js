/**
 * Retail Store Management System (RSMS) - Database Layer
 * Conforming to Software Engineering Project Specifications:
 * Tables: USER, CATEGORY, PRODUCT, CUSTOMER, SUPPLIER, SALE, SALE_ITEM, PURCHASE, SETTINGS
 * Persistent storage via localStorage / in-memory fallback.
 * Operates on ANY computer without server or database installation.
 */

const RSMS_DB_KEY = 'RSMS_DATABASE_V1';

// Initial Seed Data with realistic retail items, suppliers, users, and customers
const DEFAULT_INITIAL_DATA = {
  settings: {
    storeName: "FreshMart Supermarket",
    tagline: "Quality Groceries & Daily Needs",
    address: "MG Road, Metro Pillar 42, Bangalore - 560001",
    phone: "+91 98765 43210",
    email: "contact@freshmart.store",
    gstin: "29AAAAA0000A1Z5",
    currency: "₹",
    taxRate: 5.0, // 5% default tax rate as specified in project report
    invoicePrefix: "BILL-",
    nextInvoiceNumber: 1026
  },
  users: [
    {
      userId: 1,
      name: "System Admin",
      username: "admin",
      password: "admin123",
      role: "admin", // admin, manager, cashier, stock_clerk
      status: "active",
      createdAt: "2026-01-01"
    },
    {
      userId: 2,
      name: "Suresh Menon",
      username: "manager",
      password: "manager123",
      role: "manager",
      status: "active",
      createdAt: "2026-01-05"
    },
    {
      userId: 3,
      name: "Ravi Sharma",
      username: "cashier",
      password: "cashier123",
      role: "cashier",
      status: "active",
      createdAt: "2026-01-10"
    },
    {
      userId: 4,
      name: "Anand Verma",
      username: "stock",
      password: "stock123",
      role: "stock_clerk",
      status: "active",
      createdAt: "2026-01-12"
    }
  ],
  categories: [
    { categoryId: 1, name: "Groceries & Staples", icon: "fa-seedling", color: "#10b981", description: "Flour, rice, grains, pulses, and cooking oils" },
    { categoryId: 2, name: "Dairy & Eggs", icon: "fa-cheese", color: "#f59e0b", description: "Milk, butter, curd, cheese, paneer, and farm eggs" },
    { categoryId: 3, name: "Snacks & Confectionery", icon: "fa-cookie-bite", color: "#ec4899", description: "Biscuits, chips, chocolates, and cookies" },
    { categoryId: 4, name: "Beverages", icon: "fa-mug-hot", color: "#3b82f6", description: "Tea, coffee, fruit juices, and soft drinks" },
    { categoryId: 5, name: "Bakery & Fresh", icon: "fa-bread-slice", color: "#8b5cf6", description: "Breads, buns, cakes, and fresh fruit" },
    { categoryId: 6, name: "Personal Care", icon: "fa-pump-soap", color: "#06b6d4", description: "Soaps, shampoo, toothpaste, and handwash" },
    { categoryId: 7, name: "Household & Cleaning", icon: "fa-spray-can", color: "#64748b", description: "Detergents, floor cleaners, and kitchen supplies" }
  ],
  products: [
    {
      productId: 101,
      name: "Rice (5 kg)",
      categoryId: 1,
      barcode: "890123456001",
      price: 320.00,
      costPrice: 265.00,
      stockQuantity: 45,
      minimumLevel: 15,
      expiryDate: "2027-06-30",
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 102,
      name: "Milk (1 L)",
      categoryId: 2,
      barcode: "890123456002",
      price: 28.00,
      costPrice: 23.50,
      stockQuantity: 8, // Low stock on purpose (<= 15) to demonstrate TC09
      minimumLevel: 15,
      expiryDate: "2026-11-22", // Expiring soon
      imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 103,
      name: "Biscuits (Oreo 120g)",
      categoryId: 3,
      barcode: "890123456003",
      price: 10.00,
      costPrice: 7.50,
      stockQuantity: 80,
      minimumLevel: 20,
      expiryDate: "2027-04-15",
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 104,
      name: "Whole Wheat Bread (400g)",
      categoryId: 5,
      barcode: "890123456004",
      price: 45.00,
      costPrice: 34.00,
      stockQuantity: 5, // Low stock on purpose to demonstrate alerts
      minimumLevel: 10,
      expiryDate: "2026-11-20", // Expiring very soon
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 105,
      name: "Aashirvaad Atta (5 kg)",
      categoryId: 1,
      barcode: "890123456005",
      price: 260.00,
      costPrice: 215.00,
      stockQuantity: 30,
      minimumLevel: 10,
      expiryDate: "2027-03-31",
      imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 106,
      name: "Amul Pure Butter (500g)",
      categoryId: 2,
      barcode: "890123456006",
      price: 275.00,
      costPrice: 235.00,
      stockQuantity: 22,
      minimumLevel: 8,
      expiryDate: "2027-01-15",
      imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 107,
      name: "Nescafe Instant Coffee (200g)",
      categoryId: 4,
      barcode: "890123456007",
      price: 360.00,
      costPrice: 295.00,
      stockQuantity: 18,
      minimumLevel: 10,
      expiryDate: "2027-10-30",
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 108,
      name: "Heinz Tomato Ketchup (500g)",
      categoryId: 1,
      barcode: "890123456008",
      price: 125.00,
      costPrice: 98.00,
      stockQuantity: 35,
      minimumLevel: 12,
      expiryDate: "2027-08-20",
      imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 109,
      name: "Lay's Classic Potato Chips (50g)",
      categoryId: 3,
      barcode: "890123456009",
      price: 20.00,
      costPrice: 15.00,
      stockQuantity: 65,
      minimumLevel: 25,
      expiryDate: "2027-05-10",
      imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 110,
      name: "Coca Cola (1.5 L)",
      categoryId: 4,
      barcode: "890123456010",
      price: 85.00,
      costPrice: 68.00,
      stockQuantity: 40,
      minimumLevel: 15,
      expiryDate: "2027-07-25",
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 111,
      name: "Dove Beauty Bar Soap (100g)",
      categoryId: 6,
      barcode: "890123456011",
      price: 55.00,
      costPrice: 42.00,
      stockQuantity: 50,
      minimumLevel: 20,
      expiryDate: "2028-02-14",
      imageUrl: "https://images.unsplash.com/photo-1607006314774-60c7f4e91fb6?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 112,
      name: "Colgate Strong Teeth (200g)",
      categoryId: 6,
      barcode: "890123456012",
      price: 115.00,
      costPrice: 92.00,
      stockQuantity: 28,
      minimumLevel: 10,
      expiryDate: "2027-11-15",
      imageUrl: "https://images.unsplash.com/photo-1559591937-e1115b81a070?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 113,
      name: "Organic Farm Eggs (Pack of 12)",
      categoryId: 2,
      barcode: "890123456013",
      price: 90.00,
      costPrice: 72.00,
      stockQuantity: 14, // Low stock (min level 15)
      minimumLevel: 15,
      expiryDate: "2026-11-28",
      imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 114,
      name: "Cadbury Dairy Milk Silk (150g)",
      categoryId: 3,
      barcode: "890123456014",
      price: 175.00,
      costPrice: 140.00,
      stockQuantity: 32,
      minimumLevel: 12,
      expiryDate: "2027-09-18",
      imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 115,
      name: "Dettol Handwash (250ml)",
      categoryId: 6,
      barcode: "890123456015",
      price: 99.00,
      costPrice: 76.00,
      stockQuantity: 24,
      minimumLevel: 10,
      expiryDate: "2028-04-30",
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 116,
      name: "Tropicana Orange Juice (1 L)",
      categoryId: 4,
      barcode: "890123456016",
      price: 120.00,
      costPrice: 95.00,
      stockQuantity: 3, // Out of stock / very critical (min level 15)
      minimumLevel: 15,
      expiryDate: "2026-12-05",
      imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 117,
      name: "Extra Virgin Olive Oil (1 L)",
      categoryId: 1,
      barcode: "890123456017",
      price: 850.00,
      costPrice: 690.00,
      stockQuantity: 12,
      minimumLevel: 5,
      expiryDate: "2027-12-31",
      imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60"
    },
    {
      productId: 118,
      name: "Yogurt Natural (400g)",
      categoryId: 2,
      barcode: "890123456018",
      price: 50.00,
      costPrice: 38.00,
      stockQuantity: 10,
      minimumLevel: 12,
      expiryDate: "2026-11-10", // EXPIRED to demonstrate expired warning!
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=60"
    }
  ],
  customers: [
    { customerId: 1, name: "Walk-in Customer", phone: "N/A", address: "In-store", email: "walkin@store.local", createdAt: "2026-01-01" },
    { customerId: 2, name: "Priya Sharma", phone: "9876543211", address: "Apt 4B, Palm Grove, MG Road", email: "priya.s@gmail.com", createdAt: "2026-02-15" },
    { customerId: 3, name: "Ramesh Patel", phone: "9823456789", address: "14/2, 5th Cross, Indiranagar", email: "ramesh.p@yahoo.com", createdAt: "2026-03-01" },
    { customerId: 4, name: "Ananya Iyer", phone: "9988776655", address: "Flat 202, Royal Residency, Koramangala", email: "ananya.iyer@outlook.com", createdAt: "2026-04-10" }
  ],
  suppliers: [
    { supplierId: 1, name: "Metro Wholesale Ltd", contactPerson: "Rajesh Gupta", phone: "9811223344", address: "Plot 45, APMC Market Yard, Yeshwanthpur", email: "supply@metrowholesale.in" },
    { supplierId: 2, name: "Amul Dairy Distributors", contactPerson: "Vikram Shah", phone: "9822334455", address: "Dairy Circle, Bannerghatta Road, Bangalore", email: "sales@amuldairyblore.in" },
    { supplierId: 3, name: "Britannia & ITC Logistics", contactPerson: "Kavita Reddy", phone: "9833445566", address: "Industrial Area, Peenya Phase 2, Bangalore", email: "dist@brititclog.in" },
    { supplierId: 4, name: "Hindustan FMCG Supply", contactPerson: "Manoj Joshi", phone: "9844556677", address: "Warehouse Complex, Hosur Road, Bangalore", email: "fmcg@hfmcgsupply.com" }
  ],
  sales: [
    {
      saleId: 1,
      billNo: "BILL-1025",
      customerId: 1,
      customerName: "Walk-in Customer",
      userId: 3,
      cashierName: "Ravi Sharma",
      date: "2026-11-18 14:30:00",
      subtotal: 406.00,
      taxRate: 5.0,
      taxAmount: 20.30,
      discountAmount: 0.00,
      totalAmount: 426.30,
      paymentMode: "UPI",
      items: [
        { productId: 101, productName: "Rice (5 kg)", quantity: 1, price: 320.00, costPrice: 265.00, itemTotal: 320.00 },
        { productId: 102, productName: "Milk (1 L)", quantity: 2, price: 28.00, costPrice: 23.50, itemTotal: 56.00 },
        { productId: 103, productName: "Biscuits (Oreo 120g)", quantity: 3, price: 10.00, costPrice: 7.50, itemTotal: 30.00 }
      ]
    },
    {
      saleId: 2,
      billNo: "BILL-1024",
      customerId: 2,
      customerName: "Priya Sharma",
      userId: 3,
      cashierName: "Ravi Sharma",
      date: "2026-11-18 11:15:00",
      subtotal: 735.00,
      taxRate: 5.0,
      taxAmount: 36.75,
      discountAmount: 25.00,
      totalAmount: 746.75,
      paymentMode: "Card",
      items: [
        { productId: 105, productName: "Aashirvaad Atta (5 kg)", quantity: 1, price: 260.00, costPrice: 215.00, itemTotal: 260.00 },
        { productId: 106, productName: "Amul Pure Butter (500g)", quantity: 1, price: 275.00, costPrice: 235.00, itemTotal: 275.00 },
        { productId: 110, productName: "Coca Cola (1.5 L)", quantity: 2, price: 85.00, costPrice: 68.00, itemTotal: 170.00 },
        { productId: 104, productName: "Whole Wheat Bread (400g)", quantity: 1, price: 45.00, costPrice: 34.00, itemTotal: 45.00 }
      ]
    },
    {
      saleId: 3,
      billNo: "BILL-1023",
      customerId: 3,
      customerName: "Ramesh Patel",
      userId: 3,
      cashierName: "Ravi Sharma",
      date: "2026-11-17 17:45:00",
      subtotal: 580.00,
      taxRate: 5.0,
      taxAmount: 29.00,
      discountAmount: 10.00,
      totalAmount: 599.00,
      paymentMode: "Cash",
      items: [
        { productId: 107, productName: "Nescafe Instant Coffee (200g)", quantity: 1, price: 360.00, costPrice: 295.00, itemTotal: 360.00 },
        { productId: 114, productName: "Cadbury Dairy Milk Silk (150g)", quantity: 1, price: 175.00, costPrice: 140.00, itemTotal: 175.00 },
        { productId: 104, productName: "Whole Wheat Bread (400g)", quantity: 1, price: 45.00, costPrice: 34.00, itemTotal: 45.00 }
      ]
    }
  ],
  purchases: [
    {
      purchaseId: 501,
      invoiceNo: "INV-METRO-8841",
      supplierId: 1,
      supplierName: "Metro Wholesale Ltd",
      productId: 101,
      productName: "Rice (5 kg)",
      quantity: 50,
      costPrice: 265.00,
      totalAmount: 13250.00,
      date: "2026-11-10 10:00:00",
      notes: "Received premium grade Basmati rice bags"
    },
    {
      purchaseId: 502,
      invoiceNo: "INV-AMUL-3290",
      supplierId: 2,
      supplierName: "Amul Dairy Distributors",
      productId: 102,
      productName: "Milk (1 L)",
      quantity: 40,
      costPrice: 23.50,
      totalAmount: 940.00,
      date: "2026-11-15 08:30:00",
      notes: "Morning dairy supply batch 4B"
    },
    {
      purchaseId: 503,
      invoiceNo: "INV-BRIT-7110",
      supplierId: 3,
      supplierName: "Britannia & ITC Logistics",
      productId: 103,
      productName: "Biscuits (Oreo 120g)",
      quantity: 100,
      costPrice: 7.50,
      totalAmount: 750.00,
      date: "2026-11-12 14:00:00",
      paymentStatus: "Pending",
      paidAmount: 0,
      notes: "Biscuit stock replenishment"
    }
  ]
};


// ---- Small synchronous SHA-256 so passwords are not stored as plain text ----
function rsmsHash(message) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = Array.from(new TextEncoder().encode(String(message)));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[off+i*4] << 24) | (bytes[off+i*4+1] << 16) | (bytes[off+i*4+2] << 8) | bytes[off+i*4+3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
    H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

class RSMSDatabase {
  constructor() {
    this.data = this.load();
  }

  // Brings older saved data up to date (new fields, hashed passwords)
  migrate(data) {
    data.activityLog = data.activityLog || [];
    data.stockAdjustments = data.stockAdjustments || [];
    data.categories = data.categories || [];
    data.users.forEach(u => {
      if (!/^[0-9a-f]{64}$/.test(u.password || '')) u.password = rsmsHash(u.password || '');
    });
    (data.sales || []).forEach(s => { if (!s.status) s.status = 'Completed'; });
    (data.purchases || []).forEach(p => {
      if (!p.paymentStatus) { p.paymentStatus = 'Paid'; p.paidAmount = p.totalAmount; }
    });
    return data;
  }

  // Records who did what (shown on the Activity Log page)
  logActivity(action, details = '') {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    this.data.activityLog.unshift({
      time: stamp,
      user: this.actor || 'System',
      action: action,
      details: details
    });
    if (this.data.activityLog.length > 300) this.data.activityLog.length = 300;
    this.saveData();
  }

  getActivityLog() {
    return [...this.data.activityLog];
  }

  load() {
    try {
      const stored = localStorage.getItem(RSMS_DB_KEY);
      if (stored) {
        const parsed = this.migrate(JSON.parse(stored));
        this.saveData(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn("localStorage not available or error reading; using memory data.", e);
    }
    // First time initialization: Save seed data
    const initial = this.migrate(JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA)));
    this.saveData(initial);
    return initial;
  }

  saveData(dataToSave) {
    try {
      localStorage.setItem(RSMS_DB_KEY, JSON.stringify(dataToSave || this.data));
    } catch (e) {
      console.warn("Error saving to localStorage", e);
    }
  }

  resetToDefaults() {
    this.data = this.migrate(JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA)));
    this.saveData();
    return this.data;
  }

  exportBackup() {
    return JSON.stringify(this.data, null, 2);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.products && parsed.users && parsed.sales) {
        this.data = this.migrate(parsed);
        this.saveData();
        this.logActivity('Backup restored', 'Database restored from a backup file');
        return { success: true, message: "Database restored successfully." };
      }
      return { success: false, message: "Invalid backup format: Missing required tables." };
    } catch (e) {
      return { success: false, message: "JSON parsing error: " + e.message };
    }
  }

  // ================= USER & AUTHENTICATION =================
  login(username, password) {
    const user = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (!user) {
      return { success: false, message: "User not found." };
    }
    if (user.password !== rsmsHash(password)) {
      return { success: false, message: "Invalid password." };
    }
    if (user.status !== "active") {
      return { success: false, message: "User account is inactive. Please contact Administrator." };
    }
    this.actor = user.name;
    this.logActivity('Login', `${user.name} signed in as ${user.role}`);
    return {
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        role: user.role
      }
    };
  }

  getUsers() {
    return [...this.data.users];
  }

  addUser(userData) {
    const exists = this.data.users.some(u => u.username.toLowerCase() === userData.username.toLowerCase().trim());
    if (exists) {
      throw new Error(`Username '${userData.username}' is already taken.`);
    }
    const newId = (this.data.users.reduce((max, u) => Math.max(max, u.userId), 0) || 0) + 1;
    const newUser = {
      userId: newId,
      name: userData.name,
      username: userData.username.trim(),
      password: rsmsHash(userData.password),
      role: userData.role,
      status: "active",
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.data.users.push(newUser);
    this.saveData();
    this.logActivity('User created', `${newUser.username} (${newUser.role})`);
    return newUser;
  }

  deleteUser(userId) {
    const idx = this.data.users.findIndex(u => u.userId === userId);
    if (idx === -1) throw new Error("User not found.");
    if (this.data.users[idx].username === "admin") {
      throw new Error("Cannot delete primary system administrator.");
    }
    const removed = this.data.users.splice(idx, 1)[0];
    this.saveData();
    this.logActivity('User deleted', removed.username);
    return true;
  }

  changePassword(userId, oldPassword, newPassword) {
    const user = this.data.users.find(u => u.userId === userId);
    if (!user) throw new Error("User not found.");
    if (user.password !== rsmsHash(oldPassword)) throw new Error("Current password is incorrect.");
    if (!newPassword || newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    user.password = rsmsHash(newPassword);
    this.saveData();
    this.logActivity('Password changed', user.username);
    return true;
  }

  updateUserRole(userId, newRole) {
    const user = this.data.users.find(u => u.userId === userId);
    if (!user) throw new Error("User not found.");
    user.role = newRole;
    this.saveData();
    this.logActivity('User role changed', `${user.username} is now ${newRole}`);
    return user;
  }

  // ================= CATEGORIES =================
  getCategories() {
    return [...this.data.categories];
  }

  getCategoryById(id) {
    return this.data.categories.find(c => c.categoryId === parseInt(id));
  }

  addCategory(categoryData) {
    if (!categoryData.name || !categoryData.name.trim()) throw new Error("Category name is required.");
    if (this.data.categories.some(c => c.name.toLowerCase() === categoryData.name.trim().toLowerCase())) {
      throw new Error("A category with this name already exists.");
    }
    const newId = (this.data.categories.reduce((max, c) => Math.max(max, c.categoryId), 0) || 0) + 1;
    const newCategory = {
      categoryId: newId,
      name: categoryData.name,
      icon: categoryData.icon || "fa-box",
      color: categoryData.color || "#4b5563",
      description: categoryData.description || ""
    };
    this.data.categories.push(newCategory);
    this.saveData();
    this.logActivity('Category added', newCategory.name);
    return newCategory;
  }

  updateCategory(categoryId, d) {
    const cat = this.getCategoryById(categoryId);
    if (!cat) throw new Error("Category not found.");
    if (!d.name || !d.name.trim()) throw new Error("Category name is required.");
    const clash = this.data.categories.some(c => c.categoryId !== cat.categoryId && c.name.toLowerCase() === d.name.trim().toLowerCase());
    if (clash) throw new Error("Another category already uses this name.");
    cat.name = d.name.trim();
    cat.description = d.description || "";
    if (d.icon) cat.icon = d.icon;
    if (d.color) cat.color = d.color;
    this.saveData();
    this.logActivity('Category edited', cat.name);
    return cat;
  }

  deleteCategory(categoryId) {
    const id = parseInt(categoryId);
    const idx = this.data.categories.findIndex(c => c.categoryId === id);
    if (idx === -1) throw new Error("Category not found.");
    const used = this.data.products.filter(p => p.categoryId === id).length;
    if (used > 0) throw new Error(`Cannot delete: ${used} product(s) still use this category. Move them first.`);
    const removed = this.data.categories.splice(idx, 1)[0];
    this.saveData();
    this.logActivity('Category deleted', removed.name);
    return true;
  }

  // ================= PRODUCTS & INVENTORY =================
  getProducts() {
    return [...this.data.products];
  }

  getProductById(id) {
    return this.data.products.find(p => p.productId === parseInt(id));
  }

  getProductByBarcode(barcode) {
    if (!barcode) return null;
    return this.data.products.find(p => p.barcode.trim() === barcode.trim());
  }

  searchProducts(query, categoryId = null) {
    let list = this.data.products;
    if (categoryId && categoryId !== 'all') {
      list = list.filter(p => p.categoryId === parseInt(categoryId));
    }
    if (query && query.trim() !== "") {
      const q = query.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    }
    return list;
  }

  addProduct(productData) {
    if (!productData.name || !productData.price) {
      throw new Error("Product name and price are required.");
    }
    const newId = (this.data.products.reduce((max, p) => Math.max(max, p.productId), 0) || 100) + 1;
    const barcode = productData.barcode || `890123456${String(newId).padStart(3, '0')}`;
    
    // Check duplicate barcode
    if (this.getProductByBarcode(barcode)) {
      throw new Error(`Barcode '${barcode}' already exists for another product.`);
    }

    const newProduct = {
      productId: newId,
      name: productData.name,
      categoryId: parseInt(productData.categoryId) || 1,
      barcode: barcode,
      price: parseFloat(productData.price) || 0,
      costPrice: parseFloat(productData.costPrice) || (parseFloat(productData.price) * 0.8),
      stockQuantity: parseInt(productData.stockQuantity) || 0,
      minimumLevel: parseInt(productData.minimumLevel) || 10,
      expiryDate: productData.expiryDate || "2027-12-31",
      imageUrl: productData.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60"
    };

    this.data.products.push(newProduct);
    this.saveData();
    this.logActivity('Product added', newProduct.name);
    return newProduct;
  }

  updateProduct(productId, updateData) {
    const product = this.getProductById(productId);
    if (!product) throw new Error("Product not found.");

    const oldPrice = product.price;
    if (updateData.name !== undefined) product.name = updateData.name;
    if (updateData.categoryId !== undefined) product.categoryId = parseInt(updateData.categoryId);
    if (updateData.barcode !== undefined) product.barcode = updateData.barcode;
    if (updateData.price !== undefined) product.price = parseFloat(updateData.price);
    if (updateData.costPrice !== undefined) product.costPrice = parseFloat(updateData.costPrice);
    if (updateData.stockQuantity !== undefined) product.stockQuantity = parseInt(updateData.stockQuantity);
    if (updateData.minimumLevel !== undefined) product.minimumLevel = parseInt(updateData.minimumLevel);
    if (updateData.expiryDate !== undefined) product.expiryDate = updateData.expiryDate;
    if (updateData.imageUrl !== undefined) product.imageUrl = updateData.imageUrl;

    this.saveData();
    if (oldPrice !== product.price) {
      this.logActivity('Price changed', `${product.name}: ${oldPrice} to ${product.price}`);
    } else {
      this.logActivity('Product edited', product.name);
    }
    return product;
  }

  // Damaged / expired / wasted goods: reduces stock and keeps a record
  adjustStock(productId, quantity, reason, note = "") {
    const product = this.getProductById(productId);
    if (!product) throw new Error("Product not found.");
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) throw new Error("Quantity must be greater than zero.");
    if (qty > product.stockQuantity) throw new Error(`Only ${product.stockQuantity} unit(s) in stock.`);
    product.stockQuantity -= qty;
    this.data.stockAdjustments.unshift({
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      productId: product.productId, productName: product.name,
      quantity: qty, reason: reason, note: note, user: this.actor || 'System'
    });
    this.saveData();
    this.logActivity('Stock adjusted', `${product.name}: -${qty} (${reason})`);
    return product;
  }

  deleteProduct(productId) {
    const idx = this.data.products.findIndex(p => p.productId === parseInt(productId));
    if (idx === -1) throw new Error("Product not found.");
    const removed = this.data.products.splice(idx, 1)[0];
    this.saveData();
    this.logActivity('Product deleted', removed.name);
    return true;
  }

  // Low Stock Items (Stock_Quantity <= Minimum_Level) per Figure 7 & Section 2.3
  getLowStockProducts() {
    return this.data.products.filter(p => p.stockQuantity <= p.minimumLevel);
  }

  // Items Expired or Expiring in 30 days
  getExpiringProducts(daysThreshold = 30) {
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + daysThreshold);

    return this.data.products.filter(p => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      return exp <= futureLimit;
    }).map(p => {
      const exp = new Date(p.expiryDate);
      const isExpired = exp < now;
      const diffTime = exp - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...p,
        isExpired: isExpired,
        daysRemaining: diffDays
      };
    });
  }

  // ================= SUPPLIERS & PURCHASES =================
  getSuppliers() {
    return [...this.data.suppliers];
  }

  getSupplierById(id) {
    return this.data.suppliers.find(s => s.supplierId === parseInt(id));
  }

  addSupplier(supplierData) {
    const newId = (this.data.suppliers.reduce((max, s) => Math.max(max, s.supplierId), 0) || 0) + 1;
    const newSupplier = {
      supplierId: newId,
      name: supplierData.name,
      contactPerson: supplierData.contactPerson || "",
      phone: supplierData.phone,
      address: supplierData.address || "",
      email: supplierData.email || ""
    };
    this.data.suppliers.push(newSupplier);
    this.saveData();
    this.logActivity('Supplier added', newSupplier.name);
    return newSupplier;
  }

  updateSupplier(supplierId, d) {
    const s = this.getSupplierById(supplierId);
    if (!s) throw new Error("Supplier not found.");
    s.name = d.name; s.contactPerson = d.contactPerson || ""; s.phone = d.phone;
    s.email = d.email || ""; s.address = d.address || "";
    this.saveData();
    this.logActivity('Supplier edited', s.name);
    return s;
  }

  getSupplierDue(supplierId) {
    return this.data.purchases
      .filter(p => p.supplierId === parseInt(supplierId))
      .reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount || 0)), 0);
  }

  deleteSupplier(supplierId) {
    const idx = this.data.suppliers.findIndex(s => s.supplierId === parseInt(supplierId));
    if (idx === -1) throw new Error("Supplier not found.");
    const due = this.getSupplierDue(supplierId);
    if (due > 0) throw new Error(`Cannot delete: ${due.toFixed(2)} is still unpaid to this supplier.`);
    const removed = this.data.suppliers.splice(idx, 1)[0];
    this.saveData();
    this.logActivity('Supplier deleted', removed.name);
    return true;
  }

  markPurchasePaid(purchaseId) {
    const pur = this.data.purchases.find(p => p.purchaseId === parseInt(purchaseId));
    if (!pur) throw new Error("Purchase record not found.");
    pur.paymentStatus = "Paid";
    pur.paidAmount = pur.totalAmount;
    this.saveData();
    this.logActivity('Supplier payment', `${pur.supplierName} invoice ${pur.invoiceNo} marked paid`);
    return pur;
  }

  // Receive stock from supplier (TC10 & Functional Requirement 4.2)
  // Increases stock, records purchase, updates cost price
  receiveStock(purchaseData) {
    const product = this.getProductById(purchaseData.productId);
    if (!product) throw new Error("Product not found.");
    const supplier = this.getSupplierById(purchaseData.supplierId);
    if (!supplier) throw new Error("Supplier not found.");

    const qty = parseInt(purchaseData.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }
    const costPrice = parseFloat(purchaseData.costPrice) || product.costPrice;

    // 1. Update Product Stock
    product.stockQuantity += qty;
    product.costPrice = costPrice; // Update latest cost price

    // 2. Record Purchase Transaction
    const newId = (this.data.purchases.reduce((max, p) => Math.max(max, p.purchaseId), 0) || 500) + 1;
    const newPurchase = {
      purchaseId: newId,
      invoiceNo: purchaseData.invoiceNo || `PUR-${newId}`,
      supplierId: supplier.supplierId,
      supplierName: supplier.name,
      productId: product.productId,
      productName: product.name,
      quantity: qty,
      costPrice: costPrice,
      totalAmount: qty * costPrice,
      date: purchaseData.date || new Date().toISOString().replace('T', ' ').substring(0, 19),
      paymentStatus: purchaseData.paymentStatus === 'Pending' ? 'Pending' : 'Paid',
      paidAmount: purchaseData.paymentStatus === 'Pending' ? 0 : qty * costPrice,
      notes: purchaseData.notes || "Stock replenishment"
    };

    this.data.purchases.unshift(newPurchase);
    this.saveData();
    this.logActivity('Stock received', `${qty} x ${product.name} from ${supplier.name}`);

    return {
      purchase: newPurchase,
      updatedProduct: product
    };
  }

  getPurchases() {
    return [...this.data.purchases];
  }

  // ================= CUSTOMERS =================
  getCustomers() {
    return [...this.data.customers];
  }

  getCustomerById(id) {
    return this.data.customers.find(c => c.customerId === parseInt(id));
  }

  addCustomer(customerData) {
    const newId = (this.data.customers.reduce((max, c) => Math.max(max, c.customerId), 0) || 0) + 1;
    const newCustomer = {
      customerId: newId,
      name: customerData.name,
      phone: customerData.phone || "N/A",
      address: customerData.address || "In-store",
      email: customerData.email || "",
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.data.customers.push(newCustomer);
    this.saveData();
    return newCustomer;
  }

  updateCustomer(customerId, d) {
    const c = this.getCustomerById(customerId);
    if (!c) throw new Error("Customer not found.");
    c.name = d.name; c.phone = d.phone || "N/A"; c.email = d.email || ""; c.address = d.address || "";
    this.saveData();
    return c;
  }

  deleteCustomer(customerId) {
    const id = parseInt(customerId);
    if (id === 1) throw new Error("The Walk-in Customer record cannot be deleted.");
    const idx = this.data.customers.findIndex(c => c.customerId === id);
    if (idx === -1) throw new Error("Customer not found.");
    this.data.customers.splice(idx, 1);
    this.saveData();
    return true;
  }

  // ================= SALES & POS BILLING =================
  // Implements Activity Diagram (Figure 7), State Chart (Figure 10) & TC05, TC06, TC07, TC08
  calculateBill(cartItems, discountAmount = 0, taxRate = 5.0) {
    let subtotal = 0;
    const processedItems = cartItems.map(item => {
      const product = this.getProductById(item.productId);
      const price = product ? product.price : item.price;
      const costPrice = product ? product.costPrice : 0;
      const qty = parseInt(item.quantity) || 1;
      const itemTotal = price * qty;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        productName: product ? product.name : item.productName,
        quantity: qty,
        price: price,
        costPrice: costPrice,
        itemTotal: parseFloat(itemTotal.toFixed(2))
      };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const discount = parseFloat(discountAmount) || 0;
    const totalAmount = Math.max(0, parseFloat((subtotal + taxAmount - discount).toFixed(2)));

    return {
      subtotal,
      taxRate,
      taxAmount,
      discountAmount: discount,
      totalAmount,
      items: processedItems
    };
  }

  // Process checkout: checks stock availability (TC08), deducts stock (TC07), saves sale
  processSale({
    customerId = 1,
    userId,
    cashierName,
    cartItems,
    discountAmount = 0,
    paymentMode = "Cash", // Cash, Card, UPI
    notes = ""
  }) {
    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cannot checkout an empty bill.");
    }

    // 1. Stock Availability Check (TC08 & Figure 7)
    for (const item of cartItems) {
      const product = this.getProductById(item.productId);
      if (!product) {
        throw new Error(`Product ID ${item.productId} not found.`);
      }
      if (item.quantity > product.stockQuantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${product.stockQuantity}`
        );
      }
    }

    // 2. Calculate Totals
    const calculation = this.calculateBill(cartItems, discountAmount, this.data.settings.taxRate);

    // 3. Atomically Deduct Stock (TC07: "New Stock = Old Stock - Quantity Sold")
    const lowStockAlerts = [];
    for (const item of cartItems) {
      const product = this.getProductById(item.productId);
      product.stockQuantity -= item.quantity;
      if (product.stockQuantity <= product.minimumLevel) {
        lowStockAlerts.push(product.name);
      }
    }

    // 4. Record Sale
    const customer = this.getCustomerById(customerId) || { customerId: 1, name: "Walk-in Customer" };
    const billNumber = `${this.data.settings.invoicePrefix}${this.data.settings.nextInvoiceNumber}`;
    this.data.settings.nextInvoiceNumber += 1;

    const newSaleId = (this.data.sales.reduce((max, s) => Math.max(max, s.saleId), 0) || 1000) + 1;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

    const newSale = {
      saleId: newSaleId,
      billNo: billNumber,
      customerId: customer.customerId,
      customerName: customer.name,
      userId: userId || 3,
      cashierName: cashierName || "Cashier",
      date: formattedDate,
      subtotal: calculation.subtotal,
      taxRate: calculation.taxRate,
      taxAmount: calculation.taxAmount,
      discountAmount: calculation.discountAmount,
      totalAmount: calculation.totalAmount,
      paymentMode: paymentMode,
      items: calculation.items,
      status: "Completed",
      notes: notes
    };

    this.data.sales.unshift(newSale);
    this.saveData();
    this.logActivity('Sale completed', `${billNumber} total ${calculation.totalAmount.toFixed(2)} (${paymentMode})`);

    return {
      success: true,
      sale: newSale,
      lowStockAlerts: lowStockAlerts
    };
  }

  getSales() {
    return [...this.data.sales];
  }

  getSaleById(saleId) {
    return this.data.sales.find(s => s.saleId === parseInt(saleId));
  }

  // Cancels a bill that was already printed: the bill stays on record (read-only)
  // but is marked Cancelled and the stock goes back on the shelf.
  voidSale(saleId, reason) {
    const sale = this.getSaleById(saleId);
    if (!sale) throw new Error("Bill not found.");
    if (sale.status === 'Cancelled') throw new Error("This bill is already cancelled.");
    sale.items.forEach(item => {
      const product = this.getProductById(item.productId);
      if (product) product.stockQuantity += item.quantity;
    });
    sale.status = 'Cancelled';
    sale.cancelReason = reason || 'No reason given';
    sale.cancelledBy = this.actor || 'System';
    this.saveData();
    this.logActivity('Bill cancelled', `${sale.billNo}: ${sale.cancelReason}`);
    return sale;
  }

  getSaleByBillNo(billNo) {
    return this.data.sales.find(s => s.billNo.toLowerCase() === billNo.toLowerCase());
  }

  // ================= REPORTS & ANALYTICS (MANAGER & OWNER) =================
  // Daily, weekly, monthly sales reports, top selling products, profit calculation
  getSalesReport({ startDate = null, endDate = null, period = 'all' } = {}) {
    let salesList = this.data.sales.filter(s => s.status !== 'Cancelled');

    const now = new Date();
    if (period === 'today') {
      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      salesList = salesList.filter(s => s.date.startsWith(todayStr));
    } else if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      salesList = salesList.filter(s => new Date(s.date) >= oneWeekAgo);
    } else if (period === 'month') {
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      salesList = salesList.filter(s => s.date.startsWith(currentMonthStr));
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      salesList = salesList.filter(s => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });
    }

    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalCOGS = 0; // Cost of Goods Sold
    let totalItemsSold = 0;

    const productSalesMap = {};
    const paymentModeMap = { Cash: 0, Card: 0, UPI: 0 };
    const categorySalesMap = {};

    salesList.forEach(sale => {
      totalRevenue += sale.totalAmount;
      totalTax += sale.taxAmount;
      totalDiscount += sale.discountAmount;
      paymentModeMap[sale.paymentMode] = (paymentModeMap[sale.paymentMode] || 0) + sale.totalAmount;

      sale.items.forEach(item => {
        totalItemsSold += item.quantity;
        const cogs = (item.costPrice || 0) * item.quantity;
        totalCOGS += cogs;

        // Top products tally
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            productId: item.productId,
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.itemTotal;
        productSalesMap[item.productId].profit += (item.itemTotal - cogs);

        // Category breakdown
        const prod = this.getProductById(item.productId);
        const catId = prod ? prod.categoryId : 1;
        const cat = this.getCategoryById(catId) || { name: "Other" };
        categorySalesMap[cat.name] = (categorySalesMap[cat.name] || 0) + item.itemTotal;
      });
    });

    const grossProfit = totalRevenue - totalCOGS - totalTax; // Pure profit above COGS
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Current Inventory Valuation
    let totalStockValuationCost = 0;
    let totalStockValuationRetail = 0;
    let totalStockUnits = 0;
    this.data.products.forEach(p => {
      totalStockUnits += p.stockQuantity;
      totalStockValuationCost += (p.costPrice * p.stockQuantity);
      totalStockValuationRetail += (p.price * p.stockQuantity);
    });

    return {
      period,
      totalBills: salesList.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(1)),
      totalItemsSold,
      topSellingProducts,
      categorySalesMap,
      paymentModeMap,
      inventoryValuation: {
        totalUnits: totalStockUnits,
        costValue: parseFloat(totalStockValuationCost.toFixed(2)),
        retailValue: parseFloat(totalStockValuationRetail.toFixed(2)),
        potentialProfit: parseFloat((totalStockValuationRetail - totalStockValuationCost).toFixed(2))
      },
      sales: salesList
    };
  }

  // ================= SETTINGS =================
  getSettings() {
    return { ...this.data.settings };
  }

  updateSettings(newSettings) {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings
    };
    this.saveData();
    this.logActivity('Settings updated', 'Store profile or tax rate changed');
    return this.data.settings;
  }
}

// Global database instance
window.rsmsDB = new RSMSDatabase();
