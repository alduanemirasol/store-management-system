/**
 * helpers.js
 * Utility functions shared across all modules.
 * Updated to match the new schema field names.
 */

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatStock(stockRow, baseUnitName) {
  // stockRow is product_stock row; baseUnitName from units table
  const qty = stockRow ? Number(stockRow.quantity) : 0;
  return qty.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatQty(qty) {
  return Number(qty).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatPeso(amount, decimals = 2) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("open");
    modal.style.display = "flex";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("open");
    modal.style.display = "none";
  }
}

// ─── Time ─────────────────────────────────────────────────────────────────────

function relativeTime(date) {
  const diffMin = Math.floor((new Date() - new Date(date)) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return diffMin + "m ago";
  if (diffMin < 1440) return Math.floor(diffMin / 60) + "h ago";
  return Math.floor(diffMin / 1440) + "d ago";
}

// ─── ID generation ───────────────────────────────────────────────────────────

function newId(table) {
  const arr = db[table] || [];
  if (!arr.length) return 1;
  return Math.max(...arr.map((r) => r.id || 0)) + 1;
}

// ─── Schema helpers ──────────────────────────────────────────────────────────

/**
 * Get the active product_unit_prices row for a product_unit.
 * Mirrors SQL: WHERE product_unit_id=? AND effective_date<=today
 *              AND (expiry_date IS NULL OR expiry_date>=today)
 *              ORDER BY effective_date DESC LIMIT 1
 */
function getActiveUnitPrice(productUnitId) {
  const today = new Date().toISOString().split("T")[0];
  const rows = db.product_unit_prices
    .filter(
      (p) =>
        p.product_unit_id === productUnitId &&
        p.effective_date <= today &&
        (p.expiry_date === null || p.expiry_date >= today),
    )
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || null;
}

/**
 * Get the active pricing_tier for a product_unit at a given qty.
 * Follows the pricing resolution in the schema spec.
 */
function getActivePricingTier(productUnitId, qty) {
  const today = new Date().toISOString().split("T")[0];
  const tiers = db.pricing_tiers
    .filter(
      (t) =>
        t.product_unit_id === productUnitId &&
        t.quantity_min <= qty &&
        t.quantity_max >= qty &&
        t.effective_from <= today &&
        (t.effective_to === null || t.effective_to >= today),
    )
    .sort((a, b) => b.quantity_min - a.quantity_min);
  return tiers[0] || null;
}

/**
 * Resolve the unit price for a product_unit + qty combo.
 * Returns { unit_price, total_price, tier } following pricing resolution order:
 *   1. pricing_tiers
 *   2. product_unit_prices (standard)
 * Returns null if no price found.
 */
function resolvePrice(productUnitId, qty) {
  const tier = getActivePricingTier(productUnitId, qty);
  if (tier) {
    if (tier.tier_type === "BUNDLE_PRICE") {
      const unitPrice = tier.total_price / tier.quantity_min;
      return { unit_price: unitPrice, total_price: tier.total_price, tier };
    }
    // VOLUME_DISCOUNT or FLAT_RATE
    return {
      unit_price: tier.price_per_unit,
      total_price: tier.price_per_unit * qty,
      tier,
    };
  }

  const priceRow = getActiveUnitPrice(productUnitId);
  if (priceRow) {
    return {
      unit_price: priceRow.selling_price,
      total_price: priceRow.selling_price * qty,
      tier: null,
    };
  }

  return null;
}

/**
 * Get the base unit name string for a product.
 * products.base_unit_id → units.name
 */
function getProductBaseUnitName(product) {
  const u = db.units.find((u) => u.id === product.base_unit_id);
  return u ? u.name : "unit";
}

/**
 * Get the category name for a product.
 */
function getProductCategoryName(product) {
  const cat = db.categories.find((c) => c.id === product.category_id);
  return cat ? cat.name : "";
}

/**
 * Get the stock row for a product.
 */
function getProductStock(productId) {
  return db.product_stock.find((s) => s.product_id === productId) || null;
}

/**
 * Get the low_stock_threshold — stored on products (new schema carries it
 * as an optional field we add for UI purposes; schema doesn't define one,
 * so we keep it on the product row as an extension).
 */
function getLowStockThreshold(product) {
  return product.low_stock_threshold || 0;
}

/**
 * Convert a quantity in a product_unit's display unit to base units.
 * quantity_in_base = qty * product_units.pack_quantity
 */
function toBaseUnits(productUnit, qty) {
  if (!productUnit) return qty;
  return qty * productUnit.pack_quantity;
}

/**
 * Get all product_units for a product that can be sold (can_sell = true).
 */
function getSellableUnits(productId) {
  return db.product_units.filter(
    (u) => u.product_id === productId && u.can_sell,
  );
}

/**
 * Get all product_units for a product that can be used to restock (can_restock = true).
 */
function getRestockableUnits(productId) {
  return db.product_units.filter(
    (u) => u.product_id === productId && u.can_restock,
  );
}

/**
 * Get the default selling unit for a product.
 */
function getDefaultSellingUnit(productId) {
  return (
    db.product_units.find(
      (u) => u.product_id === productId && u.is_default_selling && u.can_sell,
    ) ||
    db.product_units.find((u) => u.product_id === productId && u.can_sell) ||
    null
  );
}

/**
 * Insert a stock_movements record and update product_stock.
 * quantity_changed: positive = added, negative = removed.
 */
function recordStockMovement({
  product_id,
  stock_log_reason_id,
  quantity_changed,
  reference_type = null,
  reference_id = null,
  notes = null,
}) {
  const userId = currentUser ? currentUser.id : null;

  // Insert movement record
  db.stock_movements.unshift({
    id: newId("stock_movements"),
    product_id,
    stock_log_reason_id,
    quantity_changed,
    reference_type,
    reference_id,
    notes,
    created_by: userId,
    created_at: new Date().toISOString(),
  });

  // Update product_stock
  const stockRow = db.product_stock.find((s) => s.product_id === product_id);
  if (stockRow) {
    stockRow.quantity += quantity_changed;
    stockRow.updated_at = new Date().toISOString();
    stockRow.updated_by = userId;
  }
}

// ─── Category color/emoji (UI extension — not in schema) ──────────────────────
const CAT_COLORS = [
  { key: "blue", label: "Blue", bg: "#eef2ff", text: "#3b6ef0" },
  { key: "green", label: "Green", bg: "#dcfce7", text: "#16a34a" },
  { key: "orange", label: "Orange", bg: "#ffedd5", text: "#ea580c" },
  { key: "red", label: "Red", bg: "#fee2e2", text: "#dc2626" },
  { key: "yellow", label: "Yellow", bg: "#fef3c7", text: "#d97706" },
];

// Map category id → UI color (stored in localStorage separately)
function getCatUIColor(categoryId) {
  return (db._catColors && db._catColors[categoryId]) || "blue";
}

function setCatUIColor(categoryId, colorKey) {
  if (!db._catColors) db._catColors = {};
  db._catColors[categoryId] = colorKey;
}

function getCatUIEmoji(category) {
  // emoji is stored on the category row itself (UI extension)
  return category.emoji || "📦";
}