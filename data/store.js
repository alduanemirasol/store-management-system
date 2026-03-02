/**
 * store.js
 * In-memory database matching the production MySQL schema.
 * Table names and column names mirror the schema exactly.
 * All stock quantities are stored in base units.
 */

let db = {
  // AUTH
  users: [],
  security_questions: [],
  user_security_questions: [],

  // CATALOG
  categories: [],
  units: [],
  products: [],

  // PRODUCT UNITS & PRICING
  product_units: [],
  product_unit_prices: [],
  pricing_tiers: [],

  // INVENTORY
  product_stock: [],
  stock_log_reasons: [],
  stock_movements: [],

  // CUSTOMERS
  customers: [],
  customer_addresses: [],

  // SALES
  payment_types: [],
  sales: [],
  sale_items: [],
  sales_returns: [],

  // CREDIT
  credit: [],
  credit_payments: [],

  // EXPENSES
  expense_categories: [],
  expenses: [],

  // CASH
  cash_fund: [],
  cash_fund_transactions: [],
};

// ─── Active session state (not persisted as a table) ─────────────────────────
let currentUser = null;   // users row of logged-in staff
let currentCashFund = null; // cash_fund row for the open shift

// ─── Seed data ────────────────────────────────────────────────────────────────
function seedData() {

  // AUTH — one admin user (PIN: 1234)
  db.users = [
    {
      id: 1,
      mobile_number: "09000000001",
      pin_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", // SHA-256 of "1234"
      first_name: "Admin",
      middle_name: null,
      last_name: "User",
      role: "admin",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      mobile_number: "09000000002",
      pin_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
      first_name: "Maria",
      middle_name: null,
      last_name: "Santos",
      role: "cashier",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  db.security_questions = [
    { id: 1, question_text: "What is your mother's maiden name?" },
    { id: 2, question_text: "What was your first pet's name?" },
    { id: 3, question_text: "What city were you born in?" },
  ];

  // CATALOG
  db.categories = [
    { id: 1, name: "Grains", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: "Dairy & Eggs", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: "Condiments", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: "Sweets", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: "Vegetables", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // Master unit types
  db.units = [
    { id: 1, name: "kg", created_at: new Date().toISOString() },
    { id: 2, name: "g", created_at: new Date().toISOString() },
    { id: 3, name: "mL", created_at: new Date().toISOString() },
    { id: 4, name: "L", created_at: new Date().toISOString() },
    { id: 5, name: "piece", created_at: new Date().toISOString() },
    { id: 6, name: "pack", created_at: new Date().toISOString() },
    { id: 7, name: "box", created_at: new Date().toISOString() },
    { id: 8, name: "bottle", created_at: new Date().toISOString() },
    { id: 9, name: "bag", created_at: new Date().toISOString() },
    { id: 10, name: "can", created_at: new Date().toISOString() },
    { id: 11, name: "sachet", created_at: new Date().toISOString() },
    { id: 12, name: "roll", created_at: new Date().toISOString() },
    { id: 13, name: "pair", created_at: new Date().toISOString() },
    { id: 14, name: "set", created_at: new Date().toISOString() },
    { id: 15, name: "m", created_at: new Date().toISOString() },
    { id: 16, name: "cm", created_at: new Date().toISOString() },
    { id: 17, name: "oz", created_at: new Date().toISOString() },
    { id: 18, name: "lb", created_at: new Date().toISOString() },
    { id: 19, name: "fl oz", created_at: new Date().toISOString() },
    { id: 20, name: "cup", created_at: new Date().toISOString() },
    { id: 21, name: "tray", created_at: new Date().toISOString() },
    { id: 22, name: "sack", created_at: new Date().toISOString() },
    { id: 23, name: "container", created_at: new Date().toISOString() },
  ];

  // Products — base_unit_id references units.id
  db.products = [
    { id: 1, name: "Rice", category_id: 1, base_unit_id: 1, description: null, emoji: "🌾", is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: "Egg", category_id: 2, base_unit_id: 5, description: null, emoji: "🥚", is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: "Cooking Oil", category_id: 3, base_unit_id: 3, description: null, emoji: "🫙", is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: "Candy", category_id: 4, base_unit_id: 5, description: null, emoji: "🍬", is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: "Cabbage", category_id: 5, base_unit_id: 1, description: null, emoji: "🥬", is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  /**
   * product_units — every way a product can be sold or restocked.
   *   pack_quantity: how many base units 1 of this display_name contains.
   *   is_default_selling: pre-selected on POS (only 1 per product).
   *   can_restock: shown on restock screen.
   *   can_sell: shown on POS screen.
   */
  db.product_units = [
    // Rice
    { id: 1, product_id: 1, unit_id: 1, display_name: "kg", pack_quantity: 1, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, product_id: 1, unit_id: 22, display_name: "sack", pack_quantity: 50, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 sack = 50 kg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Egg
    { id: 3, product_id: 2, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, product_id: 2, unit_id: 21, display_name: "tray", pack_quantity: 30, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 tray = 30 pieces", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Cooking Oil
    { id: 5, product_id: 3, unit_id: 3, display_name: "mL", pack_quantity: 1, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, product_id: 3, unit_id: 3, display_name: "250mL", pack_quantity: 250, is_default_selling: true, can_restock: false, can_sell: true, approx_base_qty_per_piece: null, notes: "Sell only", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, product_id: 3, unit_id: 23, display_name: "container", pack_quantity: 20000, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 container = 20 L", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Candy
    { id: 8, product_id: 4, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, product_id: 4, unit_id: 6, display_name: "pack", pack_quantity: 100, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 pack = 100 pieces", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Cabbage
    { id: 10, product_id: 5, unit_id: 1, display_name: "kg", pack_quantity: 1, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, product_id: 5, unit_id: 22, display_name: "sack", pack_quantity: 25, is_default_selling: false, can_restock: true, can_sell: false, approx_base_qty_per_piece: null, notes: "1 sack = 25 kg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, product_id: 5, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: true, can_restock: false, can_sell: true, approx_base_qty_per_piece: 0.5, notes: "~0.5 kg per piece", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // product_unit_prices — standard buy/sell per product_unit
  const today = new Date().toISOString().split("T")[0];
  db.product_unit_prices = [
    { id: 1, product_unit_id: 1, purchase_price: 55.00, selling_price: 57.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, product_unit_id: 2, purchase_price: 2750.00, selling_price: 2850.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, product_unit_id: 3, purchase_price: 9.00, selling_price: 9.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, product_unit_id: 4, purchase_price: 270.00, selling_price: 270.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, product_unit_id: 5, purchase_price: 0.148, selling_price: 0.148, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, product_unit_id: 6, purchase_price: 22.50, selling_price: 37.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, product_unit_id: 7, purchase_price: 2960.00, selling_price: 2960.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, product_unit_id: 8, purchase_price: 1.50, selling_price: 2.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, product_unit_id: 9, purchase_price: 100.00, selling_price: 130.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 10, product_unit_id: 10, purchase_price: 100.00, selling_price: 180.50, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, product_unit_id: 11, purchase_price: 2500.00, selling_price: 4512.50, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, product_unit_id: 12, purchase_price: 50.00, selling_price: 25.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  /**
   * pricing_tiers — overrides standard price for qty ranges / promos / bundles.
   * tier_type: BUNDLE_PRICE | VOLUME_DISCOUNT | FLAT_RATE
   */
  db.pricing_tiers = [
    {
      id: 1,
      product_unit_id: 8, // Candy piece
      label: "3 for 5 Deal",
      tier_type: "BUNDLE_PRICE",
      quantity_min: 3,
      quantity_max: 3,
      price_per_unit: null,
      total_price: 5.00,
      effective_from: today,
      effective_to: null,
      created_by: 1,
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // INVENTORY — stock in base units, one row per product
  db.product_stock = [
    { product_id: 1, quantity: 150, updated_at: new Date().toISOString(), updated_by: 1 }, // Rice: 150 kg
    { product_id: 2, quantity: 90, updated_at: new Date().toISOString(), updated_by: 1 }, // Egg: 90 pieces
    { product_id: 3, quantity: 60000, updated_at: new Date().toISOString(), updated_by: 1 }, // Oil: 60,000 mL
    { product_id: 4, quantity: 500, updated_at: new Date().toISOString(), updated_by: 1 }, // Candy: 500 pieces
    { product_id: 5, quantity: 25, updated_at: new Date().toISOString(), updated_by: 1 }, // Cabbage: 25 kg
  ];

  db.stock_log_reasons = [
    { id: 1, name: "Purchase" },
    { id: 2, name: "Sale" },
    { id: 3, name: "Return" },
    { id: 4, name: "Damage" },
    { id: 5, name: "Recount" },
    { id: 6, name: "Sample" },
    { id: 7, name: "Adjustment" },
  ];

  db.stock_movements = [];

  // CUSTOMERS
  db.customers = [
    {
      id: 1,
      first_name: "Juan",
      middle_name: null,
      last_name: "dela Cruz",
      contact_number: "09171234567",
      credit_limit: 500.00,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  db.customer_addresses = [
    {
      id: 1,
      customer_id: 1,
      municipality: "Consolacion",
      barangay: "Lamac",
      street: "123 Poblacion St",
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // SALES
  db.payment_types = [
    { id: 1, name: "Cash" },
    { id: 2, name: "Credit" },
    { id: 3, name: "GCash" },
    { id: 4, name: "PayMaya" },
    { id: 5, name: "Bank Transfer" },
  ];

  db.sales = [];
  db.sale_items = [];
  db.sales_returns = [];

  // CREDIT
  db.credit = [];
  db.credit_payments = [];

  // EXPENSES
  db.expense_categories = [
    { id: 1, name: "Rent", created_at: new Date().toISOString() },
    { id: 2, name: "Utilities", created_at: new Date().toISOString() },
    { id: 3, name: "Salaries", created_at: new Date().toISOString() },
    { id: 4, name: "Transportation", created_at: new Date().toISOString() },
    { id: 5, name: "Marketing", created_at: new Date().toISOString() },
    { id: 6, name: "Supplies", created_at: new Date().toISOString() },
  ];

  db.expenses = [];

  // CASH
  db.cash_fund = [];
  db.cash_fund_transactions = [];

  // Auto-open a cash fund for the admin (shift already started)
  db.cash_fund.push({
    id: 1,
    user_id: 1,
    opening_balance: 1000.00,
    closed_at: null,
    closing_balance: null,
    notes: "Opening shift",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  currentCashFund = db.cash_fund[0];
  currentUser = db.users[0];
}