/**
 * services.js
 * ─────────────────────────────────────────────
 * Responsibility: All stateful business operations
 * that read/write the db and cart.  No direct
 * DOM manipulation — returns data for UI to render.
 *
 * Services:
 *   ItemService        — CRUD for items + unit variants
 *   CartService        — cart state and checkout
 *   RestockService     — stock additions
 *   PricingService     — custom pricing CRUD
 *   DashboardService   — aggregated stats
 * ─────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════
   ITEM SERVICE
   Manages the item catalog and unit variants.
═══════════════════════════════════════════════ */
const ItemService = (() => {
  /**
   * Insert a new item into db.items.
   * @param {object} data  — item fields (no id)
   * @returns {object}     — inserted item
   */
  function create(data) {
    const item = { id: db.next_id.item++, ...data };
    db.items.push(item);
    return item;
  }

  /**
   * Update an existing item by id.
   * @param {number} id
   * @param {object} data  — fields to overwrite
   * @returns {object|null}
   */
  function update(id, data) {
    const item = getItem(id);
    if (!item) return null;
    Object.assign(item, data);
    return item;
  }

  /**
   * Delete an item and cascade-remove its units and pricing rules.
   * @param {number} id
   */
  function remove(id) {
    db.items = db.items.filter((i) => i.id !== id);
    db.item_units = db.item_units.filter((u) => u.item_id !== id);
    db.custom_pricing = db.custom_pricing.filter((p) => p.item_id !== id);
  }

  /**
   * Replace all unit variants for an item.
   * Deletes old units, inserts the new set.
   * @param {number} item_id
   * @param {object[]} units  — array of unit fields (no id / item_id)
   */
  function replaceUnits(item_id, units) {
    db.item_units = db.item_units.filter((u) => u.item_id !== item_id);
    units.forEach((u) => {
      if (u.unit_name) {
        db.item_units.push({ id: db.next_id.unit++, item_id, ...u });
      }
    });
  }

  /**
   * Return all items, optionally filtered by category and/or name substring.
   * @param {string} [category]  — '' or 'all' to skip filter
   * @param {string} [search]    — case-insensitive substring match
   * @returns {object[]}
   */
  function list(category = "all", search = "") {
    let items = db.items;
    if (category && category !== "all") {
      items = items.filter((i) => i.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.item_name.toLowerCase().includes(q));
    }
    return items;
  }

  return { create, update, remove, replaceUnits, list };
})();

/* ═══════════════════════════════════════════════
   CART SERVICE
   In-memory cart state + checkout logic.
═══════════════════════════════════════════════ */
const CartService = (() => {
  /** @type {CartItem[]} */
  let _cart = [];

  /**
   * @typedef {object} CartItem
   * @property {number}  item_id
   * @property {string}  item_name
   * @property {string}  label      — human-readable description
   * @property {number}  price      — line total
   * @property {number}  baseUnits  — stock units to deduct
   */

  /**
   * Add a line item to the cart.
   * @param {object} item           — db item record
   * @param {'base'|'unit'|'pricing'} sellType
   * @param {number|null} unitId
   * @param {number|null} pricingId
   * @param {number} qty
   * @param {number|null} overridePrice
   *
   * @returns {{ ok: boolean, error?: string, cartItem?: CartItem }}
   */
  function addItem(item, sellType, unitId, pricingId, qty, overridePrice) {
    const { total, baseUnits, label } = calcSellDetails(
      item,
      sellType,
      unitId,
      pricingId,
      qty,
      overridePrice,
    );

    if (!baseUnits || baseUnits <= 0) {
      return { ok: false, error: "Invalid quantity" };
    }
    if (baseUnits > item.stock_quantity) {
      return {
        ok: false,
        error: `Insufficient stock (available: ${fmtNum(item.stock_quantity)} ${item.base_unit})`,
      };
    }

    const cartItem = {
      item_id: item.id,
      item_name: item.item_name,
      label,
      price: total,
      baseUnits,
    };
    _cart.push(cartItem);
    return { ok: true, cartItem };
  }

  /**
   * Remove a cart item by its array index.
   * @param {number} index
   */
  function removeItem(index) {
    _cart.splice(index, 1);
  }

  /** Clear all items from the cart. */
  function clear() {
    _cart = [];
  }

  /**
   * Return a shallow copy of the cart array.
   * @returns {CartItem[]}
   */
  function getItems() {
    return [..._cart];
  }

  /**
   * Compute cart subtotal.
   * @returns {number}
   */
  function getTotal() {
    return _cart.reduce((sum, c) => sum + c.price, 0);
  }

  /**
   * Compute change given tendered amount.
   * @param {number} tendered
   * @returns {number}  (negative when underpaid)
   */
  function getChange(tendered) {
    return tendered - getTotal();
  }

  /**
   * Validate and complete a sale:
   *   1. Checks cart is not empty.
   *   2. Checks tendered >= total.
   *   3. Deducts stock for each line item.
   *   4. Appends a transaction record to db.
   *   5. Clears the cart.
   *
   * @param {number} tendered
   * @returns {{ ok: boolean, error?: string, transaction?: object }}
   */
  function checkout(tendered) {
    if (!_cart.length) {
      return { ok: false, error: "Cart is empty" };
    }
    const total = getTotal();
    if (tendered < total) {
      return { ok: false, error: "Insufficient payment" };
    }

    // Deduct stock
    _cart.forEach((c) => {
      const item = getItem(c.item_id);
      if (item) item.stock_quantity -= c.baseUnits;
    });

    // Record transaction
    const transaction = {
      id: db.next_id.txn++,
      items: [..._cart],
      total,
      tendered,
      change: tendered - total,
      time: new Date(),
    };
    db.transactions.push(transaction);

    clear();
    return { ok: true, transaction };
  }

  return {
    addItem,
    removeItem,
    clear,
    getItems,
    getTotal,
    getChange,
    checkout,
  };
})();

/* ═══════════════════════════════════════════════
   RESTOCK SERVICE
   Adds stock and records history.
═══════════════════════════════════════════════ */
const RestockService = (() => {
  /**
   * Add stock to an item.
   * @param {number} itemId
   * @param {'base'|'unit'} unitType
   * @param {number|null} unitId     — required when unitType='unit'
   * @param {number} qty
   *
   * @returns {{ ok: boolean, error?: string, baseUnits?: number }}
   */
  function restock(itemId, unitType, unitId, qty) {
    if (!qty || qty <= 0) {
      return { ok: false, error: "Enter a valid quantity" };
    }

    const item = getItem(itemId);
    if (!item) return { ok: false, error: "Item not found" };

    const { baseUnits, unitLabel, label } = calcRestockDetails(
      item,
      unitType,
      unitId,
      qty,
    );

    item.stock_quantity += baseUnits;

    db.restock_history.unshift({
      item_name: item.item_name,
      unit: unitLabel,
      qty,
      base_units: baseUnits,
      time: new Date(),
    });

    return { ok: true, baseUnits, label, item };
  }

  /**
   * Return the most recent N restock records.
   * @param {number} [limit=50]
   * @returns {object[]}
   */
  function getHistory(limit = 50) {
    return db.restock_history.slice(0, limit);
  }

  return { restock, getHistory };
})();

/* ═══════════════════════════════════════════════
   PRICING SERVICE
   CRUD for custom pricing rules.
═══════════════════════════════════════════════ */
const PricingService = (() => {
  /**
   * Add a new custom pricing rule.
   * @param {object} data
   * @returns {{ ok: boolean, error?: string, rule?: object }}
   */
  function create(data) {
    const { title, quantity, price } = data;
    if (!title || !quantity || !price) {
      return { ok: false, error: "Title, quantity, and price are required" };
    }
    const rule = { id: db.next_id.pricing++, ...data };
    db.custom_pricing.push(rule);
    return { ok: true, rule };
  }

  /**
   * Toggle the active flag of a pricing rule.
   * @param {number} id
   */
  function toggle(id) {
    const rule = db.custom_pricing.find((p) => p.id === id);
    if (rule) rule.active = !rule.active;
  }

  /**
   * Delete a pricing rule by id.
   * @param {number} id
   */
  function remove(id) {
    db.custom_pricing = db.custom_pricing.filter((p) => p.id !== id);
  }

  /**
   * Return all pricing rules (unfiltered).
   * @returns {object[]}
   */
  function list() {
    return db.custom_pricing;
  }

  return { create, toggle, remove, list };
})();

/* ═══════════════════════════════════════════════
   DASHBOARD SERVICE
   Aggregate read-only stats for the dashboard.
═══════════════════════════════════════════════ */
const DashboardService = (() => {
  /**
   * Compute all stats needed for the dashboard view.
   * @returns {object}
   */
  function getStats() {
    const today = new Date().toDateString();
    const todayTxns = db.transactions.filter(
      (t) => t.time.toDateString() === today,
    );
    const todaySales = todayTxns.reduce((s, t) => s + t.total, 0);
    const todayItems = todayTxns.reduce((s, t) => s + t.items.length, 0);
    const lowStockCnt = db.items.filter((i) => i.stock_quantity < 10).length;

    return {
      todaySales,
      todayTransactions: todayTxns.length,
      todayItems,
      catalogCount: db.items.length,
      lowStockCount: lowStockCnt,
    };
  }

  /**
   * Return recent transactions (most recent first).
   * @param {number} [limit=20]
   * @returns {object[]}
   */
  function getRecentTransactions(limit = 20) {
    return db.transactions.slice(-limit).reverse();
  }

  /**
   * Return all items with their stock status.
   * @returns {{ item: object, status: object }[]}
   */
  function getInventoryStatus() {
    return db.items.map((item) => ({
      item,
      status: getStockStatus(item),
    }));
  }

  return { getStats, getRecentTransactions, getInventoryStatus };
})();
