// ===================== SERVICES: PRICING & UNIT CALCULATIONS =====================

/**
 * Convert a quantity in a given unit to base units for an item.
 * @param {Object} item   - The item from db.items.
 * @param {string} unitId - 'base', 'unit-{id}', or 'custom-{id}'.
 * @param {number} qty    - Quantity in the given unit.
 * @returns {number} Equivalent quantity in base units.
 */
function toBaseUnits(item, unitId, qty) {
  if (!unitId || unitId === "base") return qty;
  if (unitId.startsWith("unit-")) {
    const uid = parseInt(unitId.split("-")[1]);
    const u = db.item_units.find((x) => x.id === uid);
    return u ? qty * u.pack_quantity : qty;
  }
  if (unitId.startsWith("custom-")) {
    const cid = parseInt(unitId.split("-")[1]);
    const cp = db.custom_pricing.find((x) => x.id === cid);
    return cp ? qty * cp.quantity : qty;
  }
  return qty;
}

/**
 * Get the selling price for a given unit of an item.
 * @param {Object} item   - The item from db.items.
 * @param {string} unitId - 'base', 'unit-{id}', or 'custom-{id}'.
 * @returns {number} Price per unit.
 */
function getUnitPrice(item, unitId) {
  if (!unitId || unitId === "base") return item.selling_price_per_unit;
  if (unitId.startsWith("unit-")) {
    const uid = parseInt(unitId.split("-")[1]);
    const u = db.item_units.find((x) => x.id === uid);
    return u ? u.selling_price : item.selling_price_per_unit;
  }
  if (unitId.startsWith("custom-")) {
    const cid = parseInt(unitId.split("-")[1]);
    const cp = db.custom_pricing.find((x) => x.id === cid);
    return cp ? cp.price : item.selling_price_per_unit;
  }
  return item.selling_price_per_unit;
}

/**
 * Get the display label for a unit option.
 * @param {Object} item   - The item from db.items.
 * @param {string} unitId - 'base', 'unit-{id}', or 'custom-{id}'.
 * @returns {string} Human-readable unit label.
 */
function getUnitLabel(item, unitId) {
  if (!unitId || unitId === "base") return item.base_unit;
  if (unitId.startsWith("unit-")) {
    const uid = parseInt(unitId.split("-")[1]);
    const u = db.item_units.find((x) => x.id === uid);
    return u ? u.unit_name : item.base_unit;
  }
  if (unitId.startsWith("custom-")) {
    const cid = parseInt(unitId.split("-")[1]);
    const cp = db.custom_pricing.find((x) => x.id === cid);
    return cp ? cp.title : item.base_unit;
  }
  return item.base_unit;
}

/**
 * Return active custom pricing entries for a given item.
 * "Active" means cp.active = true and today falls within start/end dates.
 */
function getActiveCustomPricing(itemId) {
  const today = new Date().toISOString().split("T")[0];
  return db.custom_pricing.filter((cp) => {
    if (cp.item_id !== itemId) return false;
    if (!cp.active) return false;
    if (cp.start_date && cp.start_date > today) return false;
    if (cp.end_date && cp.end_date < today) return false;
    return true;
  });
}

/**
 * Get a restock unit's display label given the unitId string.
 */
function getRestockUnitLabel(itemId, unitId) {
  if (!unitId || unitId === "base") return "";
  if (unitId.startsWith("unit-")) {
    const uid = parseInt(unitId.split("-")[1]);
    const u = db.item_units.find((x) => x.id === uid);
    return u ? u.unit_name : "";
  }
  return "";
}
