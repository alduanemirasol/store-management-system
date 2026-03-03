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

  db.sales = [];
  db.sale_items = [];
  db.sales_returns = [];

  // ── CREDIT ───────────────────────────────────────────────────────────────────
  db.credit = [];
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