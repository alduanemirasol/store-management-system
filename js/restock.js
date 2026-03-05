/**
 * restock.js
 * Restock page — rewritten for new schema.
 *
 * Schema mappings:
 *   Old: db.restock_history[]           → New: db.stock_movements[] with reason=Purchase
 *   Old: toBaseUnits(item, unitId, qty) → New: toBaseUnits(productUnit, qty)
 *   Old: db.item_units[]                → New: db.product_units[].can_restock
 *   Old: item.stock_quantity            → New: db.product_stock[product_id].quantity
 */

let selectedRestockProductUnitId = null; // product_units.id selected in modal
let selectedRestockProductId = null;
let restockStatusFilter = "all"; // "all" | "low" | "in"

function initRestockPage() {
  renderRestockItemsTable();
}

function renderRestockItemsTable(productsToRender) {
  const tbody = document.getElementById("restock-items-tbody");
  if (!tbody) return;

  const products = (productsToRender || db.products).filter(
    (p) => !p.is_deleted,
  );

  if (!products.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">No items available</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map((product) => {
      const stockRow = getProductStock(product.id);
      const qty = stockRow ? stockRow.quantity : 0;
      const baseUnitName = getProductBaseUnitName(product);
      const threshold = getLowStockThreshold(product);
      const isLow = threshold > 0 && qty <= threshold;
      const statusBadge = isLow
        ? '<span class="badge badge-red">Low Stock</span>'
        : '<span class="badge badge-green">In Stock</span>';

      return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">${product.emoji || "📦"}</span>
          <span>${product.name}</span>
        </div>
      </td>
      <td>${getProductCategoryName(product) || "-"}</td>
      <td>${formatQty(qty)} ${baseUnitName}</td>
      <td>${threshold > 0 ? threshold + " " + baseUnitName : "—"}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="openRestockModal(${product.id})">🔄 Restock</button>
      </td>
    </tr>`;
    })
    .join("");
}

function filterRestockItems() {
  const searchTerm = document
    .getElementById("restock-search")
    .value.toLowerCase();

  const filtered = db.products.filter((p) => {
    if (p.is_deleted) return false;

    // Search filter
    if (
      searchTerm &&
      !p.name.toLowerCase().includes(searchTerm) &&
      !getProductCategoryName(p).toLowerCase().includes(searchTerm) &&
      !getProductBaseUnitName(p).toLowerCase().includes(searchTerm)
    ) {
      return false;
    }

    // Status filter
    if (restockStatusFilter !== "all") {
      const stockRow = getProductStock(p.id);
      const qty = stockRow ? stockRow.quantity : 0;
      const threshold = getLowStockThreshold(p);
      const isLow = threshold > 0 && qty <= threshold;
      if (restockStatusFilter === "low" && !isLow) return false;
      if (restockStatusFilter === "in" && isLow) return false;
    }

    return true;
  });

  renderRestockItemsTable(filtered);
}

function setRestockStatusFilter(selectEl) {
  restockStatusFilter = selectEl.value;
  filterRestockItems();
}

// ─── Restock modal ────────────────────────────────────────────────────────────

function openRestockModal(productId) {
  selectedRestockProductId = productId;
  const product = db.products.find((p) => p.id === productId && !p.is_deleted);
  if (!product) return;

  const stockRow = getProductStock(productId);
  const qty = stockRow ? stockRow.quantity : 0;
  const baseUnitName = getProductBaseUnitName(product);

  // Item header
  document.getElementById("restock-item-details").innerHTML = `
    <div class="restock-item-header">
      <span style="font-size:28px;">${product.emoji || "📦"}</span>
      <div>
        <div style="font-size:16px;font-weight:600;">${product.name}</div>
        <div style="font-size:13px;color:var(--text3);">Current stock: ${formatQty(qty)} ${baseUnitName}</div>
      </div>
    </div>`;

  // Unit options — only can_restock units
  const restockableUnits = getRestockableUnits(productId);
  const firstUnit = restockableUnits[0];
  selectedRestockProductUnitId = firstUnit ? firstUnit.id : null;

  document.getElementById("restock-modal-units").innerHTML = restockableUnits
    .map((pu) => {
      const isDefault = pu.id === selectedRestockProductUnitId;
      const label =
        pu.pack_quantity === 1
          ? pu.display_name
          : `${pu.display_name} (${pu.pack_quantity} ${baseUnitName})`;
      return `<div class="unit-option ${isDefault ? "active" : ""}" onclick="selectRestockModalUnit(${pu.id}, this)">${label}</div>`;
    })
    .join("");

  document.getElementById("restock-modal-qty").value = "";
  document.getElementById("restock-modal-note").value = "";
  document.getElementById("restock-modal-preview").style.display = "none";

  openModal("modal-restock");
}

function selectRestockModalUnit(productUnitId, el) {
  selectedRestockProductUnitId = productUnitId;
  document
    .querySelectorAll("#restock-modal-units .unit-option")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  updateRestockModalPreview();
}

function updateRestockModalPreview() {
  const qty =
    parseFloat(document.getElementById("restock-modal-qty").value) || 0;
  const prev = document.getElementById("restock-modal-preview");

  if (!selectedRestockProductId || !qty || !selectedRestockProductUnitId) {
    prev.style.display = "none";
    return;
  }

  const product = db.products.find((p) => p.id === selectedRestockProductId);
  const pu = getProductUnit(selectedRestockProductUnitId);
  const baseQty = toBaseUnits(pu, qty);
  const baseUnitName = getProductBaseUnitName(product);
  const stockRow = getProductStock(selectedRestockProductId);
  const currentQty = stockRow ? stockRow.quantity : 0;

  prev.style.display = "block";
  prev.textContent = `✅ +${formatQty(baseQty)} ${baseUnitName} will be added. New stock: ${formatQty(currentQty + baseQty)} ${baseUnitName}`;
}

function doRestockFromModal() {
  const qty =
    parseFloat(document.getElementById("restock-modal-qty").value) || 0;
  if (!selectedRestockProductId || qty <= 0 || !selectedRestockProductUnitId) {
    toast("Enter a valid quantity", "error");
    return;
  }

  const product = db.products.find((p) => p.id === selectedRestockProductId);
  const pu = getProductUnit(selectedRestockProductUnitId);
  const baseQty = toBaseUnits(pu, qty);
  const baseUnitName = getProductBaseUnitName(product);
  const note = document.getElementById("restock-modal-note").value;
  const purchaseReasonId =
    db.stock_log_reasons.find((r) => r.name === "Purchase")?.id || 1;

  // Insert stock_movements record and update product_stock
  recordStockMovement({
    product_id: selectedRestockProductId,
    stock_log_reason_id: purchaseReasonId,
    quantity_changed: baseQty,
    reference_type: "PURCHASE",
    reference_id: null,
    notes: note || `Restocked ${qty} ${pu.display_name}`,
  });

  toast(
    `Restocked ${formatQty(baseQty)} ${baseUnitName} of ${product.name}`,
    "success",
  );
  persistDb();

  closeModal("modal-restock");
  filterRestockItems();
  renderPOSItems();
  renderInventory();
  // resetLowStockBanner: Allows banner to re-evaluate after new stock is added
  if (typeof resetLowStockBanner === "function") resetLowStockBanner();
  updateLowStockAlerts();

  if (document.getElementById("page-stocklogs").classList.contains("active"))
    renderStockLogsPage();
}