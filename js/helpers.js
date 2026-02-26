/**
 * helpers.js
 * ─────────────────────────────────────────────
 * Responsibility: Pure utility functions with NO
 * side-effects and NO DOM access.
 *
 * Exports:
 *   fmt(n)                      — currency formatter
 *   fmtNum(n, unit)             — numeric formatter with optional unit
 *   getCategoryIcon(cat)        — emoji icon for a category string
 *   getItem(id)                 — db lookup: item by id
 *   getUnits(item_id)           — db lookup: all units for an item
 *   getActivePricing(item_id)   — db lookup: currently active price rules
 *   calcRestockDetails(...)       — convert restock input → base units
 *   calcSellDetails(...)        — compute price/base-units for a cart entry
 * ─────────────────────────────────────────────
 */

/* ─── Formatters ────────────────────────────────── */

/**
 * Format a number as Philippine Peso currency.
 * @param {number} n
 * @returns {string}  e.g. "₱55.00"
 */
function fmt(n) {
  return "₱" + parseFloat(n).toFixed(2);
}

/**
 * Format a number with up to 3 decimal places, appending an optional unit.
 * @param {number} n
 * @param {string} [unit]
 * @returns {string}  e.g. "200 kg"  or  "1,500.5"
 */
function fmtNum(n, unit) {
  const formatted = parseFloat(n).toLocaleString("en", {
    maximumFractionDigits: 3,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

/* ─── Category Metadata ─────────────────────────── */

/** Map from category name to display emoji. */
const CATEGORY_ICONS = {
  Grains: "🌾",
  "Dairy & Eggs": "🥚",
  Cooking: "🫙",
  Snacks: "🍬",
  Vegetables: "🥬",
  Other: "📦",
};

/**
 * Return the emoji icon for a given category.
 * Falls back to 📦 for unknown categories.
 * @param {string} cat
 * @returns {string}
 */
function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "📦";
}

/** All known category names, used to populate dropdowns/filters. */
const ALL_CATEGORIES = Object.keys(CATEGORY_ICONS);

/* ─── DB Lookups ────────────────────────────────── */

/**
 * Find a single item by its id.
 * @param {number} id
 * @returns {object|undefined}
 */
function getItem(id) {
  return db.items.find((i) => i.id == id);
}

/**
 * Return all unit variants for a given item.
 * @param {number} item_id
 * @returns {object[]}
 */
function getUnits(item_id) {
  return db.item_units.filter((u) => u.item_id == item_id);
}

/**
 * Return all custom pricing rules that are currently active for an item.
 * A rule is active when:
 *   - active flag is true
 *   - today is on or after start_date (if set)
 *   - today is on or before end_date (if set)
 *
 * @param {number} item_id
 * @returns {object[]}
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

/* ─── Business Calculations ─────────────────────── */

/**
 * Convert a restock input (qty + unit type) into base units and cost.
 *
 * @param {object} item              — item record
 * @param {'base'|'unit'} unitType   — how the user chose to restock
 * @param {number|null} unitId       — db id of the unit variant (if unitType='unit')
 * @param {number} qty               — quantity entered by the user
 *
 * @returns {{ baseUnits: number, cost: number, label: string, unitLabel: string }}
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
 * Compute total price, base-unit quantity, and a human-readable label
 * for a single cart selection.
 *
 * @param {object} item              — item record
 * @param {'base'|'unit'|'pricing'} sellType
 * @param {number|null} unitId       — unit variant id (if sellType='unit')
 * @param {number|null} pricingId    — pricing rule id (if sellType='pricing')
 * @param {number} qty               — quantity of the selected sell-unit
 * @param {number|null} overridePrice — manual price (replaces computed total when set)
 *
 * @returns {{ total: number, baseUnits: number, label: string }}
 */
function calcSellDetails(
  item,
  sellType,
  unitId,
  pricingId,
  qty,
  overridePrice,
) {
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

  if (
    overridePrice !== null &&
    overridePrice !== undefined &&
    overridePrice !== ""
  ) {
    total = parseFloat(overridePrice) || total;
    label += " (override)";
  }

  return { total, baseUnits, label };
}

/**
 * Determine the stock-level badge class and text for an item.
 * @param {object} item
 * @returns {{ badgeClass: string, badgeText: string }}
 */
function getStockStatus(item) {
  if (item.stock_quantity < 10)
    return { badgeClass: "badge-red", badgeText: "Low" };
  if (item.stock_quantity < 50)
    return { badgeClass: "badge-orange", badgeText: "OK" };
  return { badgeClass: "badge-green", badgeText: "Good" };
}
