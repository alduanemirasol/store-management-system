const CATEGORY_ICONS = {
  Grains: "🌾",
  "Dairy & Eggs": "🥚",
  Cooking: "🫙",
  Snacks: "🍬",
  Vegetables: "🥬",
  Other: "📦",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_ICONS);

const STOCK_THRESHOLD_LOW = 10;
const STOCK_THRESHOLD_OK = 50;

function fmt(n) {
  return "₱" + parseFloat(n).toFixed(2);
}

function fmtNum(n, unit) {
  const formatted = parseFloat(n).toLocaleString("en", { maximumFractionDigits: 3 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "📦";
}

function getItem(id) {
  return db.items.find((i) => i.id == id);
}

function getUnits(item_id) {
  return db.item_units.filter((u) => u.item_id == item_id);
}

function getActivePricing(item_id) {
  const today = new Date().toISOString().split("T")[0];
  return db.custom_pricing.filter((p) => {
    if (!p.active || p.item_id != item_id) return false;
    if (p.start_date && p.start_date > today) return false;
    if (p.end_date && p.end_date < today) return false;
    return true;
  });
}

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

function getStockStatus(item) {
  if (item.stock_quantity < STOCK_THRESHOLD_LOW) return { badgeClass: "badge-red", badgeText: "Low" };
  if (item.stock_quantity < STOCK_THRESHOLD_OK) return { badgeClass: "badge-orange", badgeText: "OK" };
  return { badgeClass: "badge-green", badgeText: "Good" };
}
