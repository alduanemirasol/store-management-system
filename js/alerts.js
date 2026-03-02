/**
 * alerts.js
 * Low-stock banner and inventory alert panel — rewritten for new schema.
 *
 * Schema mappings:
 *   Old: db.items[].stock_quantity      → New: db.product_stock[product_id].quantity
 *   Old: item.low_stock_threshold       → New: product.low_stock_threshold (UI extension)
 *   Old: item.base_unit                 → New: db.units[base_unit_id].name
 */

let bannerDismissed = false;

/**
 * Returns all non-deleted products whose stock is at or below their low_stock_threshold.
 */
function getLowStockProducts() {
  return db.products.filter((p) => {
    if (p.is_deleted) return false;
    const threshold = getLowStockThreshold(p);
    if (threshold <= 0) return false;
    const stockRow = getProductStock(p.id);
    const qty = stockRow ? stockRow.quantity : 0;
    return qty <= threshold;
  });
}

function getOutOfStockProducts() {
  return db.products.filter((p) => {
    if (p.is_deleted) return false;
    const stockRow = getProductStock(p.id);
    return !stockRow || stockRow.quantity <= 0;
  });
}

function updateLowStockAlerts() {
  const lowProducts = getLowStockProducts();

  // Nav badge
  const badgeEl = document.getElementById("nav-low-stock-badge");
  if (lowProducts.length > 0) {
    badgeEl.textContent = lowProducts.length;
    badgeEl.style.display = "inline-block";
  } else {
    badgeEl.style.display = "none";
  }

  // Top banner
  const bannerEl = document.getElementById("low-stock-banner");
  const chipsEl = document.getElementById("low-stock-chips");
  if (lowProducts.length > 0 && !bannerDismissed) {
    bannerEl.style.display = "flex";
    chipsEl.innerHTML = lowProducts
      .map((p) => {
        const stockRow = getProductStock(p.id);
        const qty = stockRow ? stockRow.quantity : 0;
        const baseUnitName = getProductBaseUnitName(p);
        const isOut = qty <= 0;
        return `<span class="low-stock-chip ${isOut ? "out" : ""}" onclick="showPage('inventory')" title="Click to view inventory">
        ${p.emoji || "📦"} ${p.name}: ${formatQty(qty)} ${baseUnitName}${isOut ? " (Out)" : ""}
      </span>`;
      })
      .join("");
  } else {
    bannerEl.style.display = "none";
  }

  updateInventoryLowStockPanel(lowProducts);
}

function updateInventoryLowStockPanel(lowProducts) {
  const panel = document.getElementById("inv-low-stock-panel");
  if (!panel) return;

  if (!lowProducts || lowProducts.length === 0) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  const tbody = document.getElementById("low-stock-tbody");
  tbody.innerHTML = lowProducts
    .map((p) => {
      const stockRow = getProductStock(p.id);
      const qty = stockRow ? stockRow.quantity : 0;
      const baseUnitName = getProductBaseUnitName(p);
      const threshold = getLowStockThreshold(p);
      const isOut = qty <= 0;
      const pct =
        threshold > 0
          ? Math.min(100, Math.round((qty / threshold) * 100))
          : 100;
      const barColor = isOut ? "var(--red)" : "var(--orange)";
      const stockColor = isOut ? "var(--red)" : "var(--orange)";

      return `<tr>
      <td><strong>${p.emoji || "📦"} ${p.name}</strong></td>
      <td>
        <strong style="color:${stockColor};">${formatQty(qty)} ${baseUnitName}</strong>
        <div style="margin-top:4px;background:rgba(0,0,0,0.08);border-radius:4px;height:5px;width:100px;overflow:hidden;">
          <div style="width:${pct}%;background:${barColor};height:100%;border-radius:4px;transition:width 0.3s;"></div>
        </div>
      </td>
      <td style="color:var(--text2);">${threshold} ${baseUnitName}</td>
      <td>${
        isOut
          ? '<span class="badge badge-red">Out of Stock</span>'
          : '<span class="badge badge-orange">Low Stock</span>'
      }</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" style="background:var(--green-light);color:var(--green);" onclick="quickRestock(${p.id})">Restock</button>
          <button class="btn btn-sm btn-secondary" onclick="editItem(${p.id})">Edit Min.</button>
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

function dismissLowStockBanner() {
  bannerDismissed = true;
  document.getElementById("low-stock-banner").style.display = "none";
}

// resetBanner: Allows other modules to re-enable the banner without direct variable access.
function resetLowStockBanner() {
  bannerDismissed = false;
}
