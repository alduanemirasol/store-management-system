/**
 * helpers.js
 * Pure utility functions — formatting, lookups, and calculations.
 * No DOM manipulation; no side effects. Safe to use anywhere.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  Grains: "🌾",
  "Dairy & Eggs": "🥚",
  Cooking: "🫙",
  Snacks: "🍬",
  Vegetables: "🥬",
  Other: "📦",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_ICONS);

// Stock thresholds
const STOCK_THRESHOLD_LOW = 10;
const STOCK_THRESHOLD_OK = 50;

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Formats a number as Philippine Peso currency (e.g. ₱12.50). */
function fmt(n) {
  return "₱" + parseFloat(n).toFixed(2);
}

/** Formats a number with locale grouping and an optional unit label. */
function fmtNum(n, unit) {
  const formatted = parseFloat(n).toLocaleString("en", { maximumFractionDigits: 3 });
  return unit ? `${formatted} ${unit}` : formatted;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

/** Returns the emoji icon for a given category, defaulting to 📦. */
function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "📦";
}

/** Finds an item by ID from the database. */
function getItem(id) {
  return db.items.find((i) => i.id == id);
}

/** Returns all unit/pack variants for a given item ID. */
function getUnits(item_id) {
  return db.item_units.filter((u) => u.item_id == item_id);
}

/**
 * Returns active custom pricing rules for an item.
 * Filters by: active flag, item ID, and optional date range.
 */
function getActivePricing(item_id) {
  const today = new Date().toISOString().split("T")[0];
  return db.custom_pricing.filter((p) => {
    if (!p.active || p.item_id != item_id) return false;
    if (p.start_date && p.start_date > today) return false;
    if (p.end_date && p.end_date < today) return false;
    return true;
  });
}

// ─── Calculations ─────────────────────────────────────────────────────────────

/**
 * Calculates restock quantities and cost for a given unit selection.
 * @returns {{ baseUnits, cost, label, unitLabel }}
 */
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

/**
 * Calculates sale total, base units consumed, and a display label.
 * Supports base-unit, pack-unit, and custom-pricing sell types.
 * @returns {{ total, baseUnits, label }}
 */
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

/**
 * Returns the stock status badge info for an item.
 * @returns {{ badgeClass: string, badgeText: string }}
 */
function getStockStatus(item) {
  if (item.stock_quantity < STOCK_THRESHOLD_LOW) return { badgeClass: "badge-red", badgeText: "Low" };
  if (item.stock_quantity < STOCK_THRESHOLD_OK) return { badgeClass: "badge-orange", badgeText: "OK" };
  return { badgeClass: "badge-green", badgeText: "Good" };
}