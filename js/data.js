/**
 * data.js
 * In-memory database store and seed data for Market POS.
 * Provides the raw data layer — no business logic here.
 */

// ─── Database Schema ──────────────────────────────────────────────────────────

const db = {
  items: [],
  item_units: [],
  custom_pricing: [],
  transactions: [],
  restock_history: [],
  next_id: {
    item: 1,
    unit: 1,
    pricing: 1,
    txn: 1,
    restock: 1,
  },
};

// ─── Internal Factories ───────────────────────────────────────────────────────

/** Creates and stores a new item record. */
function _createItem(data) {
  const item = { id: db.next_id.item++, ...data };
  db.items.push(item);
  return item;
}

/** Creates and stores a new unit/pack record. */
function _createUnit(data) {
  const unit = { id: db.next_id.unit++, ...data };
  db.item_units.push(unit);
  return unit;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

/** Populates the database with sample products on first load. */
function seedDatabase() {
  const rice = _createItem({
    item_name: "Rice",
    category: "Grains",
    base_unit: "kg",
    purchase_price_per_unit: 45,
    selling_price_per_unit: 55,
    stock_quantity: 200,
    allow_override: false,
  });
  _createUnit({ item_id: rice.id, unit_name: "Sack", pack_quantity: 50, purchase_price: 2250, selling_price: 2750, note: "50 kg per sack" });

  const egg = _createItem({
    item_name: "Egg",
    category: "Dairy & Eggs",
    base_unit: "piece",
    purchase_price_per_unit: 7,
    selling_price_per_unit: 9,
    stock_quantity: 360,
    allow_override: false,
  });
  _createUnit({ item_id: egg.id, unit_name: "Tray", pack_quantity: 30, purchase_price: 210, selling_price: 270, note: "30 pieces per tray" });

  const oil = _createItem({
    item_name: "Cooking Oil",
    category: "Cooking",
    base_unit: "mL",
    purchase_price_per_unit: 0.1,
    selling_price_per_unit: 0.148,
    stock_quantity: 40000,
    allow_override: false,
  });
  _createUnit({ item_id: oil.id, unit_name: "Container", pack_quantity: 20000, purchase_price: 2000, selling_price: 2960, note: "20,000 mL per container" });
  db.custom_pricing.push({ id: db.next_id.pricing++, item_id: oil.id, title: "250mL Serving", quantity: 250, price: 37, note: "Standard serving price", active: true, start_date: "", end_date: "" });

  const candy = _createItem({
    item_name: "Candy",
    category: "Snacks",
    base_unit: "piece",
    purchase_price_per_unit: 1,
    selling_price_per_unit: 1.5,
    stock_quantity: 500,
    allow_override: false,
  });
  _createUnit({ item_id: candy.id, unit_name: "Pack", pack_quantity: 100, purchase_price: 100, selling_price: 150, note: "100 pieces per pack" });
  db.custom_pricing.push({ id: db.next_id.pricing++, item_id: candy.id, title: "3 for 5.00 Deal", quantity: 3, price: 5, note: "Promo bundle", active: true, start_date: "", end_date: "" });

  const cabbage = _createItem({
    item_name: "Cabbage",
    category: "Vegetables",
    base_unit: "kg",
    purchase_price_per_unit: 120,
    selling_price_per_unit: 180.5,
    stock_quantity: 75,
    allow_override: true,
  });
  _createUnit({ item_id: cabbage.id, unit_name: "Sack", pack_quantity: 25, purchase_price: 3000, selling_price: 4512.5, note: "25 kg per sack" });
  db.custom_pricing.push({ id: db.next_id.pricing++, item_id: cabbage.id, title: "Per Piece (Medium)", quantity: 0.5, price: 25, note: "Approx 0.5 kg medium head", active: true, start_date: "", end_date: "" });
}