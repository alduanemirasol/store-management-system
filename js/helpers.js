// CATEGORY_ICONS: Maps category names to emoji icons.
const CATEGORY_ICONS = {
  Grains: "🌾",
  "Dairy & Eggs": "🥚",
  Cooking: "🫙",
  Snacks: "🍬",
  Vegetables: "🥬",
  Other: "📦",
};

// ALL_CATEGORY_NAMES: List of available category keys.
const ALL_CATEGORIES = Object.keys(CATEGORY_ICONS);

// STOCK_THRESHOLD_LOW: Minimum stock level for low stock warning.
const STOCK_THRESHOLD_LOW = 10;
// STOCK_THRESHOLD_OK: Minimum stock level for ok status.
const STOCK_THRESHOLD_OK = 50;

// fmt: Formats number as Philippine peso currency.
function fmt(n) {
  return "₱" + parseFloat(n).toFixed(2);
}

// fmtNum: Formats number with locale separators and optional unit.
function fmtNum(n, unit) {
  const formatted = parseFloat(n).toLocaleString("en", { maximumFractionDigits: 3 });
  return unit ? `${formatted} ${unit}` : formatted;
}

// getCategoryIcon: Returns emoji icon for a category.
function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "📦";
}

// getItem: Retrieves item by ID from database.
function getItem(id) {
  return db.items.find((i) => i.id == id);
}

// getUnits: Retrieves all unit variants for an item.
function getUnits(item_id) {
  return db.item_units.filter((u) => u.item_id == item_id);
}

// getActivePricing: Returns active pricing rules for an item.
function getActivePricing(item_id) {
  const today = new Date().toISOString().split("T")[0];
  return db.custom_pricing.filter((p) => {
    if (!p.active || p.item_id != item_id) return false;
    if (p.start_date && p.start_date > today) return false;
    if (p.end_date && p.end_date < today) return false;
    return true;
  });
}

// calcRestockDetails: Calculates restock quantity and cost details.
function calcRestockDetails(item, unitType, unitId, qty) {
  if (unitType === "base") {
    return {
      baseUnits: qty,
      cost: qty * item.purchase_price_per_unit,
      label: `${qty} ${item.base_unit}`,
      unitLabel: item.base_unit,
    };
  }
  const u = db.item_units.find((u) => u.id === unitId);
  const baseUnits = qty * u.pack_quantity;
  return {
    baseUnits,
    cost: qty * u.purchase_price,
    label: `${qty} ${u.unit_name} = ${baseUnits} ${item.base_unit}`,
    unitLabel: u.unit_name,
  };
}

// calcSellDetails: Calculates sale total and quantity details.
function calcSellDetails(item, sellType, unitId, pricingId, qty, overridePrice) {
  let unitPrice = 0;
  let baseUnits = 0;
  let label = "";

  if (sellType === "base") {
    unitPrice = item.selling_price_per_unit;
    baseUnits = qty;
    label = `${qty} ${item.base_unit}`;
  } else if (sellType === "unit") {
    const u = db.item_units.find((u) => u.id === unitId);
    unitPrice = u.selling_price;
    baseUnits = qty * u.pack_quantity;
    label = `${qty} ${u.unit_name} (${baseUnits} ${item.base_unit})`;
  } else if (sellType === "pricing") {
    const p = db.custom_pricing.find((p) => p.id === pricingId);
    unitPrice = p.price;
    baseUnits = qty * p.quantity;
    label = `${qty}× ${p.title} (${baseUnits} ${item.base_unit})`;
  }

  let total = unitPrice * qty;
  if (overridePrice !== null && overridePrice !== undefined && overridePrice !== "") {
    total = parseFloat(overridePrice) || total;
    label += " (override)";
  }

  return { total, baseUnits, label };
}

// getStockStatus: Returns stock status badge info for an item.
function getStockStatus(item) {
  if (item.stock_quantity < STOCK_THRESHOLD_LOW) return { badgeClass: "badge-red", badgeText: "Low" };
  if (item.stock_quantity < STOCK_THRESHOLD_OK) return { badgeClass: "badge-orange", badgeText: "OK" };
  return { badgeClass: "badge-green", badgeText: "Good" };
}
