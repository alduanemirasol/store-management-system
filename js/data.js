/**
 * data.js
 * ─────────────────────────────────────────────
 * Responsibility: In-memory database schema,
 * auto-incrementing ID counters, and seed data.
 *
 * Exports:
 *   db            — live data store (mutated by logic modules)
 *   seedDatabase  — populates db with default demo records
 * ─────────────────────────────────────────────
 */

/**
 * Central in-memory data store.
 *
 * Schema
 * ──────
 * items[]            — master product catalog
 *   id               {number}  auto-increment PK
 *   item_name        {string}
 *   category         {string}
 *   base_unit        {string}  smallest unit (kg, piece, mL…)
 *   purchase_price_per_unit  {number}
 *   selling_price_per_unit   {number}
 *   stock_quantity   {number}  always in base units
 *   allow_override   {boolean} manual price override allowed at POS
 *
 * item_units[]       — unit variants per item (sack, tray, pack…)
 *   id               {number}
 *   item_id          {number}  FK → items.id
 *   unit_name        {string}
 *   pack_quantity    {number}  base units contained in 1 of this unit
 *   purchase_price   {number}  cost for 1 of this unit
 *   selling_price    {number}  sale price for 1 of this unit
 *   note             {string}
 *
 * custom_pricing[]   — bundle / promo price rules
 *   id               {number}
 *   item_id          {number}  FK → items.id
 *   title            {string}  display label
 *   quantity         {number}  base units covered by this price
 *   price            {number}  total price for `quantity` base units
 *   note             {string}
 *   active           {boolean}
 *   start_date       {string}  YYYY-MM-DD or ''
 *   end_date         {string}  YYYY-MM-DD or ''
 *
 * transactions[]     — completed POS sales
 *   id               {number}
 *   items            {CartItem[]}  snapshot of items sold
 *   total            {number}
 *   tendered         {number}
 *   change           {number}
 *   time             {Date}
 *
 * restock_history[]  — stock additions log
 *   item_name        {string}
 *   unit             {string}  label of restocked unit
 *   qty              {number}  how many of that unit
 *   base_units       {number}  converted total base units added
 *   time             {Date}
 *
 * next_id            — auto-increment counters
 */
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

/* ─── Internal factory helpers ─────────────────── */

/**
 * Push a new item record into db.items.
 * @param {object} data — partial item fields (no id needed)
 * @returns {object} the inserted item with its generated id
 */
function _createItem(data) {
  const item = { id: db.next_id.item++, ...data };
  db.items.push(item);
  return item;
}

/**
 * Push a new unit variant record into db.item_units.
 * @param {object} data — partial unit fields (no id needed)
 * @returns {object} the inserted unit with its generated id
 */
function _createUnit(data) {
  const unit = { id: db.next_id.unit++, ...data };
  db.item_units.push(unit);
  return unit;
}

/* ─── Seed ──────────────────────────────────────── */

/**
 * Populate db with the five demo scenarios:
 *   Rice, Egg, Cooking Oil, Candy, Cabbage.
 * Safe to call once on app init.
 */
function seedDatabase() {
  // ── Rice ──────────────────────────────────────────
  const rice = _createItem({
    item_name: "Rice",
    category: "Grains",
    base_unit: "kg",
    purchase_price_per_unit: 45,
    selling_price_per_unit: 55,
    stock_quantity: 200,
    allow_override: false,
  });
  _createUnit({
    item_id: rice.id,
    unit_name: "Sack",
    pack_quantity: 50,
    purchase_price: 2250,
    selling_price: 2750,
    note: "50 kg per sack",
  });

  // ── Egg ───────────────────────────────────────────
  const egg = _createItem({
    item_name: "Egg",
    category: "Dairy & Eggs",
    base_unit: "piece",
    purchase_price_per_unit: 7,
    selling_price_per_unit: 9,
    stock_quantity: 360,
    allow_override: false,
  });
  _createUnit({
    item_id: egg.id,
    unit_name: "Tray",
    pack_quantity: 30,
    purchase_price: 210,
    selling_price: 270,
    note: "30 pieces per tray",
  });

  // ── Cooking Oil ───────────────────────────────────
  const oil = _createItem({
    item_name: "Cooking Oil",
    category: "Cooking",
    base_unit: "mL",
    purchase_price_per_unit: 0.1,
    selling_price_per_unit: 0.148, // ≈ 37 / 250
    stock_quantity: 40000,
    allow_override: false,
  });
  _createUnit({
    item_id: oil.id,
    unit_name: "Container",
    pack_quantity: 20000,
    purchase_price: 2000,
    selling_price: 2960,
    note: "20,000 mL per container",
  });
  db.custom_pricing.push({
    id: db.next_id.pricing++,
    item_id: oil.id,
    title: "250mL Serving",
    quantity: 250,
    price: 37,
    note: "Standard serving price",
    active: true,
    start_date: "",
    end_date: "",
  });

  // ── Candy ─────────────────────────────────────────
  const candy = _createItem({
    item_name: "Candy",
    category: "Snacks",
    base_unit: "piece",
    purchase_price_per_unit: 1,
    selling_price_per_unit: 1.5,
    stock_quantity: 500,
    allow_override: false,
  });
  _createUnit({
    item_id: candy.id,
    unit_name: "Pack",
    pack_quantity: 100,
    purchase_price: 100,
    selling_price: 150,
    note: "100 pieces per pack",
  });
  db.custom_pricing.push({
    id: db.next_id.pricing++,
    item_id: candy.id,
    title: "3 for 5.00 Deal",
    quantity: 3,
    price: 5,
    note: "Promo bundle",
    active: true,
    start_date: "",
    end_date: "",
  });

  // ── Cabbage ───────────────────────────────────────
  const cabbage = _createItem({
    item_name: "Cabbage",
    category: "Vegetables",
    base_unit: "kg",
    purchase_price_per_unit: 120,
    selling_price_per_unit: 180.5,
    stock_quantity: 75,
    allow_override: true, // Supports manual per-piece price override
  });
  _createUnit({
    item_id: cabbage.id,
    unit_name: "Sack",
    pack_quantity: 25,
    purchase_price: 3000,
    selling_price: 4512.5,
    note: "25 kg per sack",
  });
  db.custom_pricing.push({
    id: db.next_id.pricing++,
    item_id: cabbage.id,
    title: "Per Piece (Medium)",
    quantity: 0.5, // approx 0.5 kg per medium head
    price: 25,
    note: "Approx 0.5 kg medium head",
    active: true,
    start_date: "",
    end_date: "",
  });
}
