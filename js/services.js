/**
 * services.js
 * Business logic helpers that operate on the new schema structure.
 * Unit conversion, pricing, and label resolution.
 */

/**
 * Get a product_units row by its composite "unit key" used in UI state.
 * unitKey is simply the product_unit.id (integer or string).
 */
function getProductUnit(productUnitId) {
  const id = parseInt(productUnitId);
  return db.product_units.find((u) => u.id === id) || null;
}

/**
 * Compute the price for a product_unit at a given quantity.
 * Returns { price, unit_price, label, tier, is_tiered }.
 * Follows the schema's pricing resolution order.
 */
function calcPrice(productUnitId, qty) {
  const pu = getProductUnit(productUnitId);
  if (!pu) return { price: 0, unit_price: 0, label: "", tier: null, is_tiered: false };

  const product = db.products.find((p) => p.id === pu.product_id);
  const baseUnitName = getProductBaseUnitName(product);
  const resolved = resolvePrice(productUnitId, qty);

  if (!resolved) {
    return { price: 0, unit_price: 0, label: `${qty} ${pu.display_name}`, tier: null, is_tiered: false };
  }

  const baseQty = toBaseUnits(pu, qty);
  let label;
  if (resolved.tier && resolved.tier.tier_type === "BUNDLE_PRICE") {
    label = `${qty} × ${resolved.tier.label || pu.display_name} (${formatQty(baseQty)} ${baseUnitName})`;
  } else if (pu.pack_quantity !== 1) {
    label = `${qty} ${pu.display_name} (${formatQty(baseQty)} ${baseUnitName})`;
  } else {
    label = `${qty} ${pu.display_name}`;
  }

  return {
    price: resolved.total_price,
    unit_price: resolved.unit_price,
    label,
    tier: resolved.tier || null,
    is_tiered: !!resolved.tier,
  };
}

/**
 * Get the display label for a product_unit.
 * Used in cart rendering, receipts, etc.
 */
function getUnitLabel(productUnitId) {
  const pu = getProductUnit(productUnitId);
  return pu ? pu.display_name : "unit";
}

/**
 * Get the standard (non-tiered) selling price for a product_unit.
 * Used to show the "normal price" when manual price is active.
 */
function getStandardSellingPrice(productUnitId) {
  const priceRow = getActiveUnitPrice(productUnitId);
  return priceRow ? priceRow.selling_price : 0;
}

/**
 * Get the restock unit label string for stock movement notes.
 */
function getRestockUnitLabel(productUnitId) {
  const pu = getProductUnit(productUnitId);
  return pu ? pu.display_name : "";
}

/**
 * Get all active pricing tiers for a product_unit (for display).
 * "Active" means today falls in effective_from … effective_to range.
 */
function getActiveTiersForUnit(productUnitId) {
  const today = new Date().toISOString().split("T")[0];
  return db.pricing_tiers.filter(
    (t) =>
      t.product_unit_id === productUnitId &&
      t.effective_from <= today &&
      (t.effective_to === null || t.effective_to >= today),
  );
}

/**
 * Check outstanding credit for a customer.
 * Returns { credit_limit, outstanding, can_add }.
 */
function getCustomerCreditStatus(customerId, newAmount = 0) {
  const customer = db.customers.find((c) => c.id === customerId && !c.is_deleted);
  if (!customer) return null;

  const outstanding = db.credit
    .filter((cr) => cr.customer_id === customerId && cr.status !== "PAID")
    .reduce((sum, cr) => sum + (cr.amount_owed - cr.amount_paid), 0);

  const canAdd = outstanding + newAmount <= customer.credit_limit;
  return { credit_limit: customer.credit_limit, outstanding, canAdd };
}