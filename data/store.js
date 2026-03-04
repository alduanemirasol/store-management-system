/**
 * store.js
 * In-memory database matching the production MySQL schema.
 * All 13 seed products fully defined with product_units, product_unit_prices,
 * product_stock, and pricing_tiers.
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

// ─── Active session state ─────────────────────────────────────────────────────
let currentUser = null;
let currentCashFund = null;

// ─── Seed data ────────────────────────────────────────────────────────────────
function seedData() {

  // ── AUTH ────────────────────────────────────────────────────────────────────
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

  // ── CATEGORIES ──────────────────────────────────────────────────────────────
  db.categories = [
    { id: 1, name: "Canned Goods", emoji: "🥫", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: "Candies", emoji: "🍬", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: "Biscuits", emoji: "🍪", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: "Vegetables", emoji: "🥬", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: "Tobacco", emoji: "🚬", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: "Eggs", emoji: "🥚", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: "Beverages", emoji: "🍺", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, name: "Snacks", emoji: "🍿", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, name: "Rice & Grains", emoji: "🌾", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 10, name: "Cooking Essentials", emoji: "🫙", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, name: "Household Supplies", emoji: "🧹", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, name: "Personal Care", emoji: "🧴", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 13, name: "Others", emoji: "📦", description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // ── UNITS (master lookup) ───────────────────────────────────────────────────
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
    { id: 24, name: "stick", created_at: new Date().toISOString() },
    { id: 25, name: "case", created_at: new Date().toISOString() },
    { id: 26, name: "canister", created_at: new Date().toISOString() },
  ];

  // ── PRODUCTS ────────────────────────────────────────────────────────────────
  //   base_unit_id references units.id
  //   low_stock_threshold is a UI extension (not in schema) kept on product row
  db.products = [
    { id: 1, name: "Rice", category_id: 9, base_unit_id: 1, emoji: "🌾", low_stock_threshold: 10, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: "Egg", category_id: 6, base_unit_id: 5, emoji: "🥚", low_stock_threshold: 30, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: "Cooking Oil", category_id: 10, base_unit_id: 3, emoji: "🫙", low_stock_threshold: 500, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: "Candy", category_id: 2, base_unit_id: 5, emoji: "🍬", low_stock_threshold: 50, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: "Onion", category_id: 4, base_unit_id: 1, emoji: "🧅", low_stock_threshold: 5, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: "Beer", category_id: 7, base_unit_id: 8, emoji: "🍺", low_stock_threshold: 12, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: "Shampoo", category_id: 12, base_unit_id: 11, emoji: "🧴", low_stock_threshold: 24, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, name: "Biscuit", category_id: 3, base_unit_id: 5, emoji: "🍪", low_stock_threshold: 30, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, name: "Sugar", category_id: 10, base_unit_id: 1, emoji: "🍚", low_stock_threshold: 10, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 10, name: "Salt", category_id: 10, base_unit_id: 1, emoji: "🧂", low_stock_threshold: 5, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, name: "Sardines", category_id: 1, base_unit_id: 10, emoji: "🐟", low_stock_threshold: 12, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, name: "Cigarettes", category_id: 5, base_unit_id: 24, emoji: "🚬", low_stock_threshold: 40, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 13, name: "Butane", category_id: 10, base_unit_id: 26, emoji: "🛢️", low_stock_threshold: 4, is_deleted: false, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // ── PRODUCT_UNITS ───────────────────────────────────────────────────────────
  //   pack_quantity = how many base units 1 of this display_name contains
  //   is_default_selling: the chip pre-selected on POS (1 per product)
  db.product_units = [
    // ── Rice (base: kg) ──────────────────────────────────────────────────────
    { id: 1, product_id: 1, unit_id: 1, display_name: "kg", pack_quantity: 1, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, product_id: 1, unit_id: 22, display_name: "sack", pack_quantity: 50, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 sack = 50 kg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Egg (base: piece) ────────────────────────────────────────────────────
    { id: 3, product_id: 2, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, product_id: 2, unit_id: 21, display_name: "tray", pack_quantity: 30, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 tray = 30 pcs", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Cooking Oil (base: mL) ───────────────────────────────────────────────
    { id: 5, product_id: 3, unit_id: 3, display_name: "mL", pack_quantity: 1, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, product_id: 3, unit_id: 3, display_name: "1/2 (250mL)", pack_quantity: 250, is_default_selling: true, can_restock: false, can_sell: true, approx_base_qty_per_piece: null, notes: "Sell only", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, product_id: 3, unit_id: 23, display_name: "container", pack_quantity: 20000, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 container=20 L", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Candy (base: piece) ──────────────────────────────────────────────────
    { id: 8, product_id: 4, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, product_id: 4, unit_id: 6, display_name: "pack", pack_quantity: 100, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 pack = 100 pcs", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Onion (base: kg) ─────────────────────────────────────────────────────
    { id: 10, product_id: 5, unit_id: 1, display_name: "kg", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, product_id: 5, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: false, can_restock: false, can_sell: true, approx_base_qty_per_piece: 0.15, notes: "~0.15 kg/piece", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, product_id: 5, unit_id: 22, display_name: "sack", pack_quantity: 25, is_default_selling: false, can_restock: true, can_sell: false, approx_base_qty_per_piece: null, notes: "1 sack = 25 kg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Beer (base: bottle) ──────────────────────────────────────────────────
    { id: 13, product_id: 6, unit_id: 8, display_name: "bottle", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 14, product_id: 6, unit_id: 25, display_name: "case", pack_quantity: 6, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 case = 6 btls", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Shampoo (base: sachet) ───────────────────────────────────────────────
    { id: 15, product_id: 7, unit_id: 11, display_name: "sachet", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 16, product_id: 7, unit_id: 6, display_name: "pack", pack_quantity: 12, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 pack = 12 sachets", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Biscuit (base: piece) ────────────────────────────────────────────────
    { id: 17, product_id: 8, unit_id: 5, display_name: "piece", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 18, product_id: 8, unit_id: 6, display_name: "pack", pack_quantity: 10, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 pack = 10 pcs", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Sugar (base: kg) ─────────────────────────────────────────────────────
    { id: 19, product_id: 9, unit_id: 1, display_name: "kg", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 20, product_id: 9, unit_id: 6, display_name: "1/4 kg", pack_quantity: 0.25, is_default_selling: false, can_restock: false, can_sell: true, approx_base_qty_per_piece: null, notes: "250g portion", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Salt (base: kg) ──────────────────────────────────────────────────────
    { id: 21, product_id: 10, unit_id: 1, display_name: "kg", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 22, product_id: 10, unit_id: 6, display_name: "pack", pack_quantity: 1, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 pack = 1 kg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Sardines (base: can) ─────────────────────────────────────────────────
    { id: 23, product_id: 11, unit_id: 10, display_name: "can", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 24, product_id: 11, unit_id: 7, display_name: "box", pack_quantity: 12, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 box = 12 cans", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Cigarettes (base: stick) ─────────────────────────────────────────────
    { id: 25, product_id: 12, unit_id: 24, display_name: "stick", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 26, product_id: 12, unit_id: 7, display_name: "box", pack_quantity: 10, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 box = 10 sticks", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 27, product_id: 12, unit_id: 6, display_name: "pack", pack_quantity: 20, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 pack = 20 stks", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // ── Butane (base: canister) ──────────────────────────────────────────────
    { id: 28, product_id: 13, unit_id: 26, display_name: "canister", pack_quantity: 1, is_default_selling: true, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 29, product_id: 13, unit_id: 7, display_name: "box", pack_quantity: 4, is_default_selling: false, can_restock: true, can_sell: true, approx_base_qty_per_piece: null, notes: "1 box = 4 canisters", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // ── PRODUCT_UNIT_PRICES ─────────────────────────────────────────────────────
  //   One active price row per product_unit (expiry_date null = open-ended).
  const today = new Date().toISOString().split("T")[0];
  db.product_unit_prices = [
    // Rice
    { id: 1, product_unit_id: 1, purchase_price: 55.00, selling_price: 57.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, product_unit_id: 2, purchase_price: 2750.00, selling_price: 2850.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Egg
    { id: 3, product_unit_id: 3, purchase_price: 9.00, selling_price: 9.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, product_unit_id: 4, purchase_price: 270.00, selling_price: 270.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Cooking Oil
    { id: 5, product_unit_id: 5, purchase_price: 0.148, selling_price: 0.148, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, product_unit_id: 6, purchase_price: 22.50, selling_price: 37.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, product_unit_id: 7, purchase_price: 2960.00, selling_price: 2960.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Candy
    { id: 8, product_unit_id: 8, purchase_price: 1.50, selling_price: 2.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, product_unit_id: 9, purchase_price: 100.00, selling_price: 130.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Onion
    { id: 10, product_unit_id: 10, purchase_price: 75.00, selling_price: 90.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 11, product_unit_id: 11, purchase_price: 11.25, selling_price: 13.50, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 12, product_unit_id: 12, purchase_price: 1875.00, selling_price: 2250.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Beer
    { id: 13, product_unit_id: 13, purchase_price: 55.00, selling_price: 70.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 14, product_unit_id: 14, purchase_price: 330.00, selling_price: 400.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Shampoo
    { id: 15, product_unit_id: 15, purchase_price: 6.00, selling_price: 8.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 16, product_unit_id: 16, purchase_price: 72.00, selling_price: 90.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Biscuit
    { id: 17, product_unit_id: 17, purchase_price: 5.00, selling_price: 6.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 18, product_unit_id: 18, purchase_price: 50.00, selling_price: 58.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Sugar
    { id: 19, product_unit_id: 19, purchase_price: 65.00, selling_price: 72.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 20, product_unit_id: 20, purchase_price: 16.25, selling_price: 18.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Salt
    { id: 21, product_unit_id: 21, purchase_price: 20.00, selling_price: 25.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 22, product_unit_id: 22, purchase_price: 20.00, selling_price: 25.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Sardines
    { id: 23, product_unit_id: 23, purchase_price: 18.00, selling_price: 22.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 24, product_unit_id: 24, purchase_price: 216.00, selling_price: 260.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Cigarettes
    { id: 25, product_unit_id: 25, purchase_price: 3.50, selling_price: 5.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 26, product_unit_id: 26, purchase_price: 35.00, selling_price: 48.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 27, product_unit_id: 27, purchase_price: 70.00, selling_price: 95.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Butane
    { id: 28, product_unit_id: 28, purchase_price: 45.00, selling_price: 55.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 29, product_unit_id: 29, purchase_price: 180.00, selling_price: 210.00, effective_date: today, expiry_date: null, created_by: 1, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // ── PRICING_TIERS ───────────────────────────────────────────────────────────
  db.pricing_tiers = [
    {
      id: 1,
      product_unit_id: 8, // Candy — piece
      label: "3 for ₱5 Deal",
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

  // ── PRODUCT_STOCK ────────────────────────────────────────────────────────────
  //   quantity always in base units; one row per product
  db.product_stock = [
    { product_id: 1, quantity: 150, updated_at: new Date().toISOString(), updated_by: 1 }, // Rice:       150 kg
    { product_id: 2, quantity: 90, updated_at: new Date().toISOString(), updated_by: 1 }, // Egg:         90 pieces
    { product_id: 3, quantity: 60000, updated_at: new Date().toISOString(), updated_by: 1 }, // Oil:      60,000 mL
    { product_id: 4, quantity: 500, updated_at: new Date().toISOString(), updated_by: 1 }, // Candy:      500 pieces
    { product_id: 5, quantity: 25, updated_at: new Date().toISOString(), updated_by: 1 }, // Onion:       25 kg
    { product_id: 6, quantity: 48, updated_at: new Date().toISOString(), updated_by: 1 }, // Beer:        48 bottles
    { product_id: 7, quantity: 120, updated_at: new Date().toISOString(), updated_by: 1 }, // Shampoo:    120 sachets
    { product_id: 8, quantity: 300, updated_at: new Date().toISOString(), updated_by: 1 }, // Biscuit:    300 pieces
    { product_id: 9, quantity: 75, updated_at: new Date().toISOString(), updated_by: 1 }, // Sugar:       75 kg
    { product_id: 10, quantity: 50, updated_at: new Date().toISOString(), updated_by: 1 }, // Salt:        50 kg
    { product_id: 11, quantity: 60, updated_at: new Date().toISOString(), updated_by: 1 }, // Sardines:    60 cans
    { product_id: 12, quantity: 200, updated_at: new Date().toISOString(), updated_by: 1 }, // Cigarettes: 200 sticks
    { product_id: 13, quantity: 16, updated_at: new Date().toISOString(), updated_by: 1 }, // Butane:      16 canisters
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

  // ── CUSTOMERS ────────────────────────────────────────────────────────────────
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

  // ── SALES ────────────────────────────────────────────────────────────────────
  db.payment_types = [
    { id: 1, name: "Cash" },
    { id: 2, name: "Credit" },
  ];

  // ── SALES (demo data) ────────────────────────────────────────────────────────
  // Dates spread across today, this week, this month, and last month
  const now = new Date();
  const daysAgo = (n, h = 10, m = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, h, m, 0);
    return d.toISOString();
  };

  db.sales = [
    // ── Today ──
    { id: 1, customer_id: null, payment_type_id: 1, sale_date: daysAgo(0, 7, 30), notes: null, created_by: 1, created_at: daysAgo(0, 7, 30), updated_at: daysAgo(0, 7, 30) },
    { id: 2, customer_id: null, payment_type_id: 1, sale_date: daysAgo(0, 9, 12), notes: null, created_by: 1, created_at: daysAgo(0, 9, 12), updated_at: daysAgo(0, 9, 12) },
    { id: 3, customer_id: null, payment_type_id: 1, sale_date: daysAgo(0, 11, 45), notes: null, created_by: 1, created_at: daysAgo(0, 11, 45), updated_at: daysAgo(0, 11, 45) },
    { id: 4, customer_id: 1, payment_type_id: 2, sale_date: daysAgo(0, 14, 30), notes: null, created_by: 1, created_at: daysAgo(0, 14, 30), updated_at: daysAgo(0, 14, 30) },
    // ── Yesterday ──
    { id: 5, customer_id: null, payment_type_id: 1, sale_date: daysAgo(1, 8, 5), notes: null, created_by: 1, created_at: daysAgo(1, 8, 5), updated_at: daysAgo(1, 8, 5) },
    { id: 6, customer_id: null, payment_type_id: 1, sale_date: daysAgo(1, 12, 20), notes: null, created_by: 1, created_at: daysAgo(1, 12, 20), updated_at: daysAgo(1, 12, 20) },
    { id: 7, customer_id: null, payment_type_id: 1, sale_date: daysAgo(1, 16, 50), notes: null, created_by: 1, created_at: daysAgo(1, 16, 50), updated_at: daysAgo(1, 16, 50) },
    // ── 2 days ago ──
    { id: 8, customer_id: null, payment_type_id: 1, sale_date: daysAgo(2, 9, 0), notes: null, created_by: 1, created_at: daysAgo(2, 9, 0), updated_at: daysAgo(2, 9, 0) },
    { id: 9, customer_id: 1, payment_type_id: 2, sale_date: daysAgo(2, 15, 10), notes: null, created_by: 1, created_at: daysAgo(2, 15, 10), updated_at: daysAgo(2, 15, 10) },
    // ── 3 days ago ──
    { id: 10, customer_id: null, payment_type_id: 1, sale_date: daysAgo(3, 8, 40), notes: null, created_by: 1, created_at: daysAgo(3, 8, 40), updated_at: daysAgo(3, 8, 40) },
    { id: 11, customer_id: null, payment_type_id: 1, sale_date: daysAgo(3, 17, 5), notes: null, created_by: 1, created_at: daysAgo(3, 17, 5), updated_at: daysAgo(3, 17, 5) },
    // ── 5 days ago ──
    { id: 12, customer_id: null, payment_type_id: 1, sale_date: daysAgo(5, 10, 30), notes: null, created_by: 1, created_at: daysAgo(5, 10, 30), updated_at: daysAgo(5, 10, 30) },
    { id: 13, customer_id: null, payment_type_id: 1, sale_date: daysAgo(5, 14, 0), notes: null, created_by: 1, created_at: daysAgo(5, 14, 0), updated_at: daysAgo(5, 14, 0) },
    // ── 8 days ago (last week) ──
    { id: 14, customer_id: null, payment_type_id: 1, sale_date: daysAgo(8, 9, 20), notes: null, created_by: 1, created_at: daysAgo(8, 9, 20), updated_at: daysAgo(8, 9, 20) },
    { id: 15, customer_id: 1, payment_type_id: 2, sale_date: daysAgo(8, 13, 45), notes: null, created_by: 1, created_at: daysAgo(8, 13, 45), updated_at: daysAgo(8, 13, 45) },
    // ── 12 days ago ──
    { id: 16, customer_id: null, payment_type_id: 1, sale_date: daysAgo(12, 11, 0), notes: null, created_by: 1, created_at: daysAgo(12, 11, 0), updated_at: daysAgo(12, 11, 0) },
    { id: 17, customer_id: null, payment_type_id: 1, sale_date: daysAgo(12, 15, 30), notes: null, created_by: 1, created_at: daysAgo(12, 15, 30), updated_at: daysAgo(12, 15, 30) },
    // ── 18 days ago ──
    { id: 18, customer_id: null, payment_type_id: 1, sale_date: daysAgo(18, 8, 15), notes: null, created_by: 1, created_at: daysAgo(18, 8, 15), updated_at: daysAgo(18, 8, 15) },
    { id: 19, customer_id: null, payment_type_id: 1, sale_date: daysAgo(18, 16, 40), notes: null, created_by: 1, created_at: daysAgo(18, 16, 40), updated_at: daysAgo(18, 16, 40) },
    // ── 25 days ago ──
    { id: 20, customer_id: null, payment_type_id: 1, sale_date: daysAgo(25, 10, 0), notes: null, created_by: 1, created_at: daysAgo(25, 10, 0), updated_at: daysAgo(25, 10, 0) },
    { id: 21, customer_id: 1, payment_type_id: 2, sale_date: daysAgo(25, 14, 20), notes: null, created_by: 1, created_at: daysAgo(25, 14, 20), updated_at: daysAgo(25, 14, 20) },
    // ── 35 days ago (last month) ──
    { id: 22, customer_id: null, payment_type_id: 1, sale_date: daysAgo(35, 9, 0), notes: null, created_by: 1, created_at: daysAgo(35, 9, 0), updated_at: daysAgo(35, 9, 0) },
    { id: 23, customer_id: null, payment_type_id: 1, sale_date: daysAgo(35, 13, 10), notes: null, created_by: 1, created_at: daysAgo(35, 13, 10), updated_at: daysAgo(35, 13, 10) },
    // ── 45 days ago ──
    { id: 24, customer_id: null, payment_type_id: 1, sale_date: daysAgo(45, 11, 30), notes: null, created_by: 1, created_at: daysAgo(45, 11, 30), updated_at: daysAgo(45, 11, 30) },
    { id: 25, customer_id: null, payment_type_id: 1, sale_date: daysAgo(45, 17, 0), notes: null, created_by: 1, created_at: daysAgo(45, 17, 0), updated_at: daysAgo(45, 17, 0) },
    // ── 60 days ago ──
    { id: 26, customer_id: null, payment_type_id: 1, sale_date: daysAgo(60, 8, 0), notes: null, created_by: 1, created_at: daysAgo(60, 8, 0), updated_at: daysAgo(60, 8, 0) },
    { id: 27, customer_id: 1, payment_type_id: 2, sale_date: daysAgo(60, 14, 30), notes: null, created_by: 1, created_at: daysAgo(60, 14, 30), updated_at: daysAgo(60, 14, 30) },
  ];

  db.sale_items = [
    // Sale 1 — today early: Egg + Candy
    { id: 1, sale_id: 1, product_unit_id: 3, quantity: 4, unit_price: 9.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 7, 30), _product_name: "Egg", _emoji: "🥚", _unit_label: "piece", _base_qty: 4 },
    { id: 2, sale_id: 1, product_unit_id: 8, quantity: 3, unit_price: 2.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 7, 30), _product_name: "Candy", _emoji: "🍬", _unit_label: "piece", _base_qty: 3 },
    // Sale 2 — today: Rice sack + Egg
    { id: 3, sale_id: 2, product_unit_id: 2, quantity: 1, unit_price: 2850.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 9, 12), _product_name: "Rice", _emoji: "🌾", _unit_label: "sack", _base_qty: 50 },
    { id: 4, sale_id: 2, product_unit_id: 3, quantity: 6, unit_price: 9.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 9, 12), _product_name: "Egg", _emoji: "🥚", _unit_label: "piece", _base_qty: 6 },
    // Sale 3 — today: Candy + Shampoo + Biscuit
    { id: 5, sale_id: 3, product_unit_id: 8, quantity: 5, unit_price: 2.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 11, 45), _product_name: "Candy", _emoji: "🍬", _unit_label: "piece", _base_qty: 5 },
    { id: 6, sale_id: 3, product_unit_id: 15, quantity: 3, unit_price: 8.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 11, 45), _product_name: "Shampoo", _emoji: "🧴", _unit_label: "sachet", _base_qty: 3 },
    { id: 7, sale_id: 3, product_unit_id: 17, quantity: 4, unit_price: 6.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 11, 45), _product_name: "Biscuit", _emoji: "🍪", _unit_label: "piece", _base_qty: 4 },
    // Sale 4 — today credit: Beer + Sardines
    { id: 8, sale_id: 4, product_unit_id: 13, quantity: 3, unit_price: 70.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 14, 30), _product_name: "Beer", _emoji: "🍺", _unit_label: "bottle", _base_qty: 3 },
    { id: 9, sale_id: 4, product_unit_id: 23, quantity: 2, unit_price: 22.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(0, 14, 30), _product_name: "Sardines", _emoji: "🐟", _unit_label: "can", _base_qty: 2 },
    // Sale 5 — yesterday: Cooking Oil + Sugar
    { id: 10, sale_id: 5, product_unit_id: 6, quantity: 2, unit_price: 37.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(1, 8, 5), _product_name: "Cooking Oil", _emoji: "🫙", _unit_label: "1/2 (250mL)", _base_qty: 500 },
    { id: 11, sale_id: 5, product_unit_id: 19, quantity: 1, unit_price: 72.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(1, 8, 5), _product_name: "Sugar", _emoji: "🍚", _unit_label: "kg", _base_qty: 1 },
    // Sale 6 — yesterday: Cigarettes + Beer (manual price)
    { id: 12, sale_id: 6, product_unit_id: 25, quantity: 10, unit_price: 5.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(1, 12, 20), _product_name: "Cigarettes", _emoji: "🚬", _unit_label: "stick", _base_qty: 10 },
    { id: 13, sale_id: 6, product_unit_id: 13, quantity: 1, unit_price: 65.00, is_manual_priced: true, manual_price_reason: "Loyalty discount", approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(1, 12, 20), _product_name: "Beer", _emoji: "🍺", _unit_label: "bottle", _base_qty: 1 },
    // Sale 7 — yesterday: Egg tray + Biscuit
    { id: 14, sale_id: 7, product_unit_id: 4, quantity: 1, unit_price: 270.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(1, 16, 50), _product_name: "Egg", _emoji: "🥚", _unit_label: "tray", _base_qty: 30 },
    { id: 15, sale_id: 7, product_unit_id: 17, quantity: 6, unit_price: 6.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(1, 16, 50), _product_name: "Biscuit", _emoji: "🍪", _unit_label: "piece", _base_qty: 6 },
    // Sale 8 — 2 days ago: Salt + Sardines + Egg
    { id: 16, sale_id: 8, product_unit_id: 21, quantity: 2, unit_price: 25.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(2, 9, 0), _product_name: "Salt", _emoji: "🧂", _unit_label: "kg", _base_qty: 2 },
    { id: 17, sale_id: 8, product_unit_id: 23, quantity: 3, unit_price: 22.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(2, 9, 0), _product_name: "Sardines", _emoji: "🐟", _unit_label: "can", _base_qty: 3 },
    { id: 18, sale_id: 8, product_unit_id: 3, quantity: 12, unit_price: 9.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(2, 9, 0), _product_name: "Egg", _emoji: "🥚", _unit_label: "piece", _base_qty: 12 },
    // Sale 9 — 2 days ago credit: Onion + Butane
    { id: 19, sale_id: 9, product_unit_id: 10, quantity: 0.5, unit_price: 90.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(2, 15, 10), _product_name: "Onion", _emoji: "🧅", _unit_label: "kg", _base_qty: 0.5 },
    { id: 20, sale_id: 9, product_unit_id: 28, quantity: 2, unit_price: 55.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(2, 15, 10), _product_name: "Butane", _emoji: "🛢️", _unit_label: "canister", _base_qty: 2 },
    // Sale 10 — 3 days ago: Rice + Shampoo
    { id: 21, sale_id: 10, product_unit_id: 1, quantity: 3, unit_price: 57.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(3, 8, 40), _product_name: "Rice", _emoji: "🌾", _unit_label: "kg", _base_qty: 3 },
    { id: 22, sale_id: 10, product_unit_id: 15, quantity: 5, unit_price: 8.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(3, 8, 40), _product_name: "Shampoo", _emoji: "🧴", _unit_label: "sachet", _base_qty: 5 },
    // Sale 11 — 3 days ago: Sugar + Salt + Candy
    { id: 23, sale_id: 11, product_unit_id: 19, quantity: 2, unit_price: 72.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(3, 17, 5), _product_name: "Sugar", _emoji: "🍚", _unit_label: "kg", _base_qty: 2 },
    { id: 24, sale_id: 11, product_unit_id: 21, quantity: 1, unit_price: 25.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(3, 17, 5), _product_name: "Salt", _emoji: "🧂", _unit_label: "kg", _base_qty: 1 },
    { id: 25, sale_id: 11, product_unit_id: 8, quantity: 8, unit_price: 2.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(3, 17, 5), _product_name: "Candy", _emoji: "🍬", _unit_label: "piece", _base_qty: 8 },
    // Sale 12 — 5 days ago: Beer case + Sardines
    { id: 26, sale_id: 12, product_unit_id: 14, quantity: 1, unit_price: 390.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(5, 10, 30), _product_name: "Beer", _emoji: "🍺", _unit_label: "case", _base_qty: 6 },
    { id: 27, sale_id: 12, product_unit_id: 23, quantity: 4, unit_price: 22.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(5, 10, 30), _product_name: "Sardines", _emoji: "🐟", _unit_label: "can", _base_qty: 4 },
    // Sale 13 — 5 days ago: Cooking Oil + Egg + Candy
    { id: 28, sale_id: 13, product_unit_id: 6, quantity: 4, unit_price: 37.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(5, 14, 0), _product_name: "Cooking Oil", _emoji: "🫙", _unit_label: "1/2 (250mL)", _base_qty: 1000 },
    { id: 29, sale_id: 13, product_unit_id: 3, quantity: 6, unit_price: 9.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(5, 14, 0), _product_name: "Egg", _emoji: "🥚", _unit_label: "piece", _base_qty: 6 },
    { id: 30, sale_id: 13, product_unit_id: 8, quantity: 6, unit_price: 2.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(5, 14, 0), _product_name: "Candy", _emoji: "🍬", _unit_label: "piece", _base_qty: 6 },
    // Sale 14 — 8 days ago: Rice + Biscuit + Shampoo
    { id: 31, sale_id: 14, product_unit_id: 2, quantity: 1, unit_price: 2850.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(8, 9, 20), _product_name: "Rice", _emoji: "🌾", _unit_label: "sack", _base_qty: 50 },
    { id: 32, sale_id: 14, product_unit_id: 17, quantity: 5, unit_price: 6.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(8, 9, 20), _product_name: "Biscuit", _emoji: "🍪", _unit_label: "piece", _base_qty: 5 },
    { id: 33, sale_id: 14, product_unit_id: 15, quantity: 2, unit_price: 8.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(8, 9, 20), _product_name: "Shampoo", _emoji: "🧴", _unit_label: "sachet", _base_qty: 2 },
    // Sale 15 — 8 days ago credit: Cigarettes + Butane
    { id: 34, sale_id: 15, product_unit_id: 25, quantity: 20, unit_price: 5.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(8, 13, 45), _product_name: "Cigarettes", _emoji: "🚬", _unit_label: "stick", _base_qty: 20 },
    { id: 35, sale_id: 15, product_unit_id: 28, quantity: 1, unit_price: 55.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(8, 13, 45), _product_name: "Butane", _emoji: "🛢️", _unit_label: "canister", _base_qty: 1 },
    // Sale 16 — 12 days ago: Onion + Sugar + Egg
    { id: 36, sale_id: 16, product_unit_id: 10, quantity: 1, unit_price: 90.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(12, 11, 0), _product_name: "Onion", _emoji: "🧅", _unit_label: "kg", _base_qty: 1 },
    { id: 37, sale_id: 16, product_unit_id: 19, quantity: 2, unit_price: 72.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(12, 11, 0), _product_name: "Sugar", _emoji: "🍚", _unit_label: "kg", _base_qty: 2 },
    { id: 38, sale_id: 16, product_unit_id: 4, quantity: 1, unit_price: 270.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(12, 11, 0), _product_name: "Egg", _emoji: "🥚", _unit_label: "tray", _base_qty: 30 },
    // Sale 17 — 12 days ago: Beer + Sardines + Candy
    { id: 39, sale_id: 17, product_unit_id: 13, quantity: 2, unit_price: 70.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(12, 15, 30), _product_name: "Beer", _emoji: "🍺", _unit_label: "bottle", _base_qty: 2 },
    { id: 40, sale_id: 17, product_unit_id: 23, quantity: 2, unit_price: 22.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(12, 15, 30), _product_name: "Sardines", _emoji: "🐟", _unit_label: "can", _base_qty: 2 },
    { id: 41, sale_id: 17, product_unit_id: 8, quantity: 10, unit_price: 2.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(12, 15, 30), _product_name: "Candy", _emoji: "🍬", _unit_label: "piece", _base_qty: 10 },
    // Sale 18 — 18 days ago: Rice + Cooking Oil
    { id: 42, sale_id: 18, product_unit_id: 1, quantity: 10, unit_price: 57.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(18, 8, 15), _product_name: "Rice", _emoji: "🌾", _unit_label: "kg", _base_qty: 10 },
    { id: 43, sale_id: 18, product_unit_id: 7, quantity: 1, unit_price: 700.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(18, 8, 15), _product_name: "Cooking Oil", _emoji: "🫙", _unit_label: "container", _base_qty: 20000 },
    // Sale 19 — 18 days ago: Cigarettes + Salt + Biscuit
    { id: 44, sale_id: 19, product_unit_id: 25, quantity: 15, unit_price: 5.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(18, 16, 40), _product_name: "Cigarettes", _emoji: "🚬", _unit_label: "stick", _base_qty: 15 },
    { id: 45, sale_id: 19, product_unit_id: 21, quantity: 3, unit_price: 25.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(18, 16, 40), _product_name: "Salt", _emoji: "🧂", _unit_label: "kg", _base_qty: 3 },
    { id: 46, sale_id: 19, product_unit_id: 18, quantity: 2, unit_price: 55.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(18, 16, 40), _product_name: "Biscuit", _emoji: "🍪", _unit_label: "pack", _base_qty: 20 },
    // Sale 20 — 25 days ago: Egg tray + Onion + Shampoo
    { id: 47, sale_id: 20, product_unit_id: 4, quantity: 2, unit_price: 270.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(25, 10, 0), _product_name: "Egg", _emoji: "🥚", _unit_label: "tray", _base_qty: 60 },
    { id: 48, sale_id: 20, product_unit_id: 10, quantity: 2, unit_price: 90.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(25, 10, 0), _product_name: "Onion", _emoji: "🧅", _unit_label: "kg", _base_qty: 2 },
    { id: 49, sale_id: 20, product_unit_id: 15, quantity: 4, unit_price: 8.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(25, 10, 0), _product_name: "Shampoo", _emoji: "🧴", _unit_label: "sachet", _base_qty: 4 },
    // Sale 21 — 25 days ago credit: Beer + Sardines + Butane
    { id: 50, sale_id: 21, product_unit_id: 14, quantity: 2, unit_price: 390.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(25, 14, 20), _product_name: "Beer", _emoji: "🍺", _unit_label: "case", _base_qty: 12 },
    { id: 51, sale_id: 21, product_unit_id: 23, quantity: 6, unit_price: 22.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(25, 14, 20), _product_name: "Sardines", _emoji: "🐟", _unit_label: "can", _base_qty: 6 },
    { id: 52, sale_id: 21, product_unit_id: 28, quantity: 3, unit_price: 55.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(25, 14, 20), _product_name: "Butane", _emoji: "🛢️", _unit_label: "canister", _base_qty: 3 },
    // Sale 22 — 35 days ago: Rice sack + Sugar + Egg
    { id: 53, sale_id: 22, product_unit_id: 2, quantity: 2, unit_price: 2850.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(35, 9, 0), _product_name: "Rice", _emoji: "🌾", _unit_label: "sack", _base_qty: 100 },
    { id: 54, sale_id: 22, product_unit_id: 19, quantity: 3, unit_price: 72.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(35, 9, 0), _product_name: "Sugar", _emoji: "🍚", _unit_label: "kg", _base_qty: 3 },
    { id: 55, sale_id: 22, product_unit_id: 4, quantity: 1, unit_price: 270.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(35, 9, 0), _product_name: "Egg", _emoji: "🥚", _unit_label: "tray", _base_qty: 30 },
    // Sale 23 — 35 days ago: Candy + Biscuit + Cigarettes
    { id: 56, sale_id: 23, product_unit_id: 9, quantity: 1, unit_price: 180.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(35, 13, 10), _product_name: "Candy", _emoji: "🍬", _unit_label: "pack", _base_qty: 100 },
    { id: 57, sale_id: 23, product_unit_id: 18, quantity: 3, unit_price: 55.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(35, 13, 10), _product_name: "Biscuit", _emoji: "🍪", _unit_label: "pack", _base_qty: 30 },
    { id: 58, sale_id: 23, product_unit_id: 25, quantity: 30, unit_price: 5.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(35, 13, 10), _product_name: "Cigarettes", _emoji: "🚬", _unit_label: "stick", _base_qty: 30 },
    // Sale 24 — 45 days ago: Beer + Onion + Salt
    { id: 59, sale_id: 24, product_unit_id: 14, quantity: 2, unit_price: 390.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(45, 11, 30), _product_name: "Beer", _emoji: "🍺", _unit_label: "case", _base_qty: 12 },
    { id: 60, sale_id: 24, product_unit_id: 10, quantity: 3, unit_price: 90.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(45, 11, 30), _product_name: "Onion", _emoji: "🧅", _unit_label: "kg", _base_qty: 3 },
    { id: 61, sale_id: 24, product_unit_id: 22, quantity: 1, unit_price: 24.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(45, 11, 30), _product_name: "Salt", _emoji: "🧂", _unit_label: "pack", _base_qty: 1 },
    // Sale 25 — 45 days ago: Shampoo pack + Sardines box + Egg
    { id: 62, sale_id: 25, product_unit_id: 16, quantity: 1, unit_price: 90.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(45, 17, 0), _product_name: "Shampoo", _emoji: "🧴", _unit_label: "pack", _base_qty: 12 },
    { id: 63, sale_id: 25, product_unit_id: 24, quantity: 1, unit_price: 240.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(45, 17, 0), _product_name: "Sardines", _emoji: "🐟", _unit_label: "box", _base_qty: 12 },
    { id: 64, sale_id: 25, product_unit_id: 3, quantity: 10, unit_price: 9.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(45, 17, 0), _product_name: "Egg", _emoji: "🥚", _unit_label: "piece", _base_qty: 10 },
    // Sale 26 — 60 days ago: Rice + Cooking Oil + Candy
    { id: 65, sale_id: 26, product_unit_id: 2, quantity: 1, unit_price: 2850.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(60, 8, 0), _product_name: "Rice", _emoji: "🌾", _unit_label: "sack", _base_qty: 50 },
    { id: 66, sale_id: 26, product_unit_id: 6, quantity: 4, unit_price: 37.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(60, 8, 0), _product_name: "Cooking Oil", _emoji: "🫙", _unit_label: "1/2 (250mL)", _base_qty: 1000 },
    { id: 67, sale_id: 26, product_unit_id: 9, quantity: 1, unit_price: 180.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(60, 8, 0), _product_name: "Candy", _emoji: "🍬", _unit_label: "pack", _base_qty: 100 },
    // Sale 27 — 60 days ago credit: Beer + Butane + Cigarettes
    { id: 68, sale_id: 27, product_unit_id: 14, quantity: 3, unit_price: 390.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(60, 14, 30), _product_name: "Beer", _emoji: "🍺", _unit_label: "case", _base_qty: 18 },
    { id: 69, sale_id: 27, product_unit_id: 28, quantity: 4, unit_price: 55.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(60, 14, 30), _product_name: "Butane", _emoji: "🛢️", _unit_label: "canister", _base_qty: 4 },
    { id: 70, sale_id: 27, product_unit_id: 25, quantity: 40, unit_price: 5.00, is_manual_priced: false, manual_price_reason: null, approved_by: null, weight_per_piece_kg: null, created_at: daysAgo(60, 14, 30), _product_name: "Cigarettes", _emoji: "🚬", _unit_label: "stick", _base_qty: 40 },
  ];

  db.sales_returns = [];

  // Deduct seeded sales from product_stock so inventory stays consistent
  const saleStockDeductions = [
    { product_id: 1, qty: 268 },  // Rice: various sales
    { product_id: 2, qty: 181 },  // Egg: pieces + trays
    { product_id: 3, qty: 23500 },// Oil: mL across all sales
    { product_id: 4, qty: 251 },  // Candy: pieces + packs
    { product_id: 5, qty: 8.5 },  // Onion: kg
    { product_id: 6, qty: 55 },   // Beer: bottles + cases
    { product_id: 7, qty: 33 },   // Shampoo: sachets + packs
    { product_id: 8, qty: 81 },   // Biscuit: pieces + packs
    { product_id: 9, qty: 11 },   // Sugar: kg
    { product_id: 10, qty: 12 },   // Salt: kg + packs
    { product_id: 11, qty: 47 },   // Sardines: cans + boxes
    { product_id: 12, qty: 125 },  // Cigarettes: sticks
    { product_id: 13, qty: 12 },   // Butane: canisters
  ];
  saleStockDeductions.forEach(({ product_id, qty }) => {
    const row = db.product_stock.find((s) => s.product_id === product_id);
    if (row) row.quantity = Math.max(0, row.quantity - qty);
  });

  // ── CREDIT ───────────────────────────────────────────────────────────────────
  // Credit records matching all credit sales: 4, 9, 15, 21, 27
  db.credit = [
    {
      id: 1,
      sale_id: 4,
      customer_id: 1,
      amount_owed: 254.00, // 3×70 + 2×22
      amount_paid: 100.00,
      due_date: (() => { const d = new Date(now); d.setDate(d.getDate() + 27); return d.toISOString().split("T")[0]; })(),
      status: "PENDING",
      notes: null,
      created_at: daysAgo(0, 14, 30),
      updated_at: daysAgo(0, 14, 30),
    },
    {
      id: 2,
      sale_id: 9,
      customer_id: 1,
      amount_owed: 155.00, // 0.5×90 + 2×55
      amount_paid: 155.00,
      due_date: (() => { const d = new Date(now); d.setDate(d.getDate() + 25); return d.toISOString().split("T")[0]; })(),
      status: "PAID",
      notes: null,
      created_at: daysAgo(2, 15, 10),
      updated_at: daysAgo(1, 9, 0),
    },
    {
      id: 3,
      sale_id: 15,
      customer_id: 1,
      amount_owed: 155.00, // 20×5 + 1×55
      amount_paid: 0,
      due_date: (() => { const d = new Date(now); d.setDate(d.getDate() + 19); return d.toISOString().split("T")[0]; })(),
      status: "PENDING",
      notes: null,
      created_at: daysAgo(8, 13, 45),
      updated_at: daysAgo(8, 13, 45),
    },
    {
      id: 4,
      sale_id: 21,
      customer_id: 1,
      amount_owed: 1043.00, // 2×390 + 6×22 + 3×55
      amount_paid: 500.00,
      due_date: (() => { const d = new Date(now); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0]; })(),
      status: "PENDING",
      notes: null,
      created_at: daysAgo(25, 14, 20),
      updated_at: daysAgo(10, 10, 0),
    },
    {
      id: 5,
      sale_id: 27,
      customer_id: 1,
      amount_owed: 1590.00, // 3×390 + 4×55 + 40×5
      amount_paid: 1590.00,
      due_date: (() => { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })(),
      status: "PAID",
      notes: null,
      created_at: daysAgo(60, 14, 30),
      updated_at: daysAgo(45, 9, 0),
    },
  ];
  db.credit_payments = [];

  // ── EXPENSES ─────────────────────────────────────────────────────────────────
  db.expense_categories = [
    { id: 1, name: "Rent", created_at: new Date().toISOString() },
    { id: 2, name: "Utilities", created_at: new Date().toISOString() },
    { id: 3, name: "Salaries", created_at: new Date().toISOString() },
    { id: 4, name: "Transportation", created_at: new Date().toISOString() },
    { id: 5, name: "Marketing", created_at: new Date().toISOString() },
    { id: 6, name: "Supplies", created_at: new Date().toISOString() },
  ];

  db.expenses = [];

  // ── CASH FUND ─────────────────────────────────────────────────────────────────
  db.cash_fund = [];
  db.cash_fund_transactions = [];

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