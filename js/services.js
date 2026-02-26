// Service: Manages inventory item CRUD operations.
const ItemService = (() => {
  // Create: Adds new item to database.
  function create(data) {
    const item = { id: db.next_id.item++, ...data };
    db.items.push(item);
    return item;
  }
  // Update: Modifies existing item properties.
  function update(id, data) {
    const item = getItem(id);
    if (!item) return null;
    Object.assign(item, data);
    return item;
  }
  // Delete: Removes item and related data.
  function remove(id) {
    db.items = db.items.filter((i) => i.id !== id);
    db.item_units = db.item_units.filter((u) => u.item_id !== id);
    db.custom_pricing = db.custom_pricing.filter((p) => p.item_id !== id);
  }
  // Update: Replaces all unit variants for an item.
  function replaceUnits(item_id, units) {
    db.item_units = db.item_units.filter((u) => u.item_id !== item_id);
    units.forEach((u) => {
      if (u.unit_name) {
        db.item_units.push({ id: db.next_id.unit++, item_id, ...u });
      }
    });
  }
  // Query: Returns filtered list of items.
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
// Service: Manages shopping cart operations.
const CartService = (() => {
  let _cart = [];
  // Add: Inserts item into cart with validation.
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
  // Remove: Deletes cart item by index.
  function removeItem(index) {
    _cart.splice(index, 1);
  }
  // Clear: Empties all items from cart.
  function clear() {
    _cart = [];
  }
  // Query: Returns copy of current cart items.
  function getItems() {
    return [..._cart];
  }
  // Query: Returns sum of all cart item prices.
  function getTotal() {
    return _cart.reduce((sum, c) => sum + c.price, 0);
  }
  // Query: Calculates change from tendered amount.
  function getChange(tendered) {
    return tendered - getTotal();
  }
  // Transaction: Processes checkout, updates stock, records sale.
  function checkout(tendered) {
    if (!_cart.length) {
      return { ok: false, error: "Cart is empty" };
    }
    const total = getTotal();
    if (tendered < total) {
      return { ok: false, error: "Insufficient payment" };
    }
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
// Service: Manages inventory restock operations.
const RestockService = (() => {
  // Action: Adds stock to item and records history.
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
  // Query: Returns recent restock history.
  function getHistory(limit = 50) {
    return db.restock_history.slice(0, limit);
  }
  return { restock, getHistory };
})();
// Service: Manages custom pricing rules.
const PricingService = (() => {
  // Create: Adds new pricing rule to database.
  function create(data) {
    const { title, quantity, price } = data;
    if (!title || !quantity || !price) {
      return { ok: false, error: "Title, quantity, and price are required" };
    }
    const rule = { id: db.next_id.pricing++, ...data };
    db.custom_pricing.push(rule);
    return { ok: true, rule };
  }
  // Toggle: Swaps pricing rule active status.
  function toggle(id) {
    const rule = db.custom_pricing.find((p) => p.id === id);
    if (rule) rule.active = !rule.active;
  }
  // Delete: Removes pricing rule permanently.
  function remove(id) {
    db.custom_pricing = db.custom_pricing.filter((p) => p.id !== id);
  }
  // Query: Returns all pricing rules.
  function list() {
    return db.custom_pricing;
  }
  return { create, toggle, remove, list };
})();
// Service: Provides dashboard statistics and reports.
const DashboardService = (() => {
  // Query: Returns today's sales stats and counts.
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
  // Query: Returns recent transactions for display.
  function getRecentTransactions(limit = 20) {
    return db.transactions.slice(-limit).reverse();
  }
  // Query: Returns all items with stock status.
  function getInventoryStatus() {
    return db.items.map((item) => ({
      item,
      status: getStockStatus(item),
    }));
  }
  return { getStats, getRecentTransactions, getInventoryStatus };
})();
