/**
 * services.js
 * Business logic services — CRUD, cart, restock, pricing, and dashboard.
 * Each service is an isolated IIFE module that operates on `db` via helpers.
 * Dependencies: data.js, helpers.js
 */

// ─── ItemService ──────────────────────────────────────────────────────────────
/**
 * Manages inventory item CRUD and unit variant replacement.
 */
const ItemService = (() => {
  /** Adds a new item to the database and returns it. */
  function create(data) {
    const item = { id: db.next_id.item++, ...data };
    db.items.push(item);
    return item;
  }

  /** Updates an existing item's properties by ID. Returns null if not found. */
  function update(id, data) {
    const item = getItem(id);
    if (!item) return null;
    Object.assign(item, data);
    return item;
  }

  /** Removes an item and all its units and pricing rules by ID. */
  function remove(id) {
    db.items = db.items.filter((i) => i.id !== id);
    db.item_units = db.item_units.filter((u) => u.item_id !== id);
    db.custom_pricing = db.custom_pricing.filter((p) => p.item_id !== id);
  }

  /**
   * Replaces all unit variants for an item.
   * Skips entries without a unit_name (blank rows).
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
   * Returns a filtered list of items.
   * @param {string} category - Category name or "all"
   * @param {string} search   - Case-insensitive name substring filter
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


// ─── CartService ──────────────────────────────────────────────────────────────
/**
 * Manages the active shopping cart — add, remove, clear, checkout.
 */
const CartService = (() => {
  let _cart = [];

  /**
   * Validates and adds an item to the cart.
   * @returns {{ ok: boolean, cartItem?, error? }}
   */
  function addItem(item, sellType, unitId, pricingId, qty, overridePrice) {
    const { total, baseUnits, label } = calcSellDetails(item, sellType, unitId, pricingId, qty, overridePrice);

    if (!baseUnits || baseUnits <= 0) {
      return { ok: false, error: "Invalid quantity" };
    }
    if (baseUnits > item.stock_quantity) {
      return { ok: false, error: `Insufficient stock (available: ${fmtNum(item.stock_quantity)} ${item.base_unit})` };
    }

    const cartItem = { item_id: item.id, item_name: item.item_name, label, price: total, baseUnits };
    _cart.push(cartItem);
    return { ok: true, cartItem };
  }

  /** Removes a cart entry by its index. */
  function removeItem(index) {
    _cart.splice(index, 1);
  }

  /** Empties the cart. */
  function clear() {
    _cart = [];
  }

  /** Returns a shallow copy of the current cart items. */
  function getItems() {
    return [..._cart];
  }

  /** Returns the sum of all cart item prices. */
  function getTotal() {
    return _cart.reduce((sum, c) => sum + c.price, 0);
  }

  /** Returns the change due from a tendered amount. */
  function getChange(tendered) {
    return tendered - getTotal();
  }

  /**
   * Processes checkout: validates payment, deducts stock, records transaction.
   * @returns {{ ok: boolean, transaction?, error? }}
   */
  function checkout(tendered) {
    if (!_cart.length) return { ok: false, error: "Cart is empty" };

    const total = getTotal();
    if (tendered < total) return { ok: false, error: "Insufficient payment" };

    // Deduct stock for each cart item
    _cart.forEach((c) => {
      const item = getItem(c.item_id);
      if (item) item.stock_quantity -= c.baseUnits;
    });

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

  return { addItem, removeItem, clear, getItems, getTotal, getChange, checkout };
})();


// ─── RestockService ───────────────────────────────────────────────────────────
/**
 * Handles inventory restocking and history tracking.
 */
const RestockService = (() => {
  /**
   * Adds stock to an item and records the event in history.
   * @returns {{ ok: boolean, baseUnits?, label?, item?, error? }}
   */
  function restock(itemId, unitType, unitId, qty) {
    if (!qty || qty <= 0) return { ok: false, error: "Enter a valid quantity" };

    const item = getItem(itemId);
    if (!item) return { ok: false, error: "Item not found" };

    const { baseUnits, unitLabel, label } = calcRestockDetails(item, unitType, unitId, qty);
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

  /** Returns recent restock history, newest first. */
  function getHistory(limit = 50) {
    return db.restock_history.slice(0, limit);
  }

  return { restock, getHistory };
})();


// ─── PricingService ───────────────────────────────────────────────────────────
/**
 * Manages custom pricing rules (bundle deals, promos, etc.).
 */
const PricingService = (() => {
  /**
   * Creates a new pricing rule after validating required fields.
   * @returns {{ ok: boolean, rule?, error? }}
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

  /** Toggles the active status of a pricing rule by ID. */
  function toggle(id) {
    const rule = db.custom_pricing.find((p) => p.id === id);
    if (rule) rule.active = !rule.active;
  }

  /** Permanently removes a pricing rule by ID. */
  function remove(id) {
    db.custom_pricing = db.custom_pricing.filter((p) => p.id !== id);
  }

  /** Returns all pricing rules. */
  function list() {
    return db.custom_pricing;
  }

  return { create, toggle, remove, list };
})();


// ─── DashboardService ─────────────────────────────────────────────────────────
/**
 * Provides aggregated stats and reports for the dashboard page.
 */
const DashboardService = (() => {
  /** Returns today's sales totals, transaction counts, and low-stock alerts. */
  function getStats() {
    const today = new Date().toDateString();
    const todayTxns = db.transactions.filter((t) => t.time.toDateString() === today);
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

  /** Returns the most recent transactions in reverse-chronological order. */
  function getRecentTransactions(limit = 20) {
    return db.transactions.slice(-limit).reverse();
  }

  /** Returns all items paired with their computed stock status badge. */
  function getInventoryStatus() {
    return db.items.map((item) => ({ item, status: getStockStatus(item) }));
  }

  return { getStats, getRecentTransactions, getInventoryStatus };
})();