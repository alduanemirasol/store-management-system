let selectedRestockUnit = null;

function initRestockPage() {
  const sel = document.getElementById("restock-item");
  sel.innerHTML =
    '<option value="">— Select item —</option>' +
    db.items
      .map(
        (i) =>
          `<option value="${i.id}">${i.emoji || ""} ${i.item_name}</option>`,
      )
      .join("");
  updateRestockOptions();
  renderRestockHistory();
}

function updateRestockOptions() {
  const itemId = parseInt(document.getElementById("restock-item").value);
  const formEl = document.getElementById("restock-form");
  if (!itemId) {
    formEl.style.display = "none";
    return;
  }
  formEl.style.display = "block";

  const item = db.items.find((i) => i.id === itemId);
  const units = db.item_units.filter((u) => u.item_id === itemId);

  const optEl = document.getElementById("restock-units");
  const opts = [
    { id: "base", label: item.base_unit },
    ...units.map((u) => ({
      id: "unit-" + u.id,
      label: u.unit_name + ` (${u.pack_quantity} ${item.base_unit})`,
    })),
  ];

  selectedRestockUnit = "base";
  optEl.innerHTML = opts
    .map(
      (o) =>
        `<div class="unit-option ${o.id === "base" ? "active" : ""}" onclick="selectRestockUnit('${o.id}', this)">${o.label}</div>`,
    )
    .join("");

  document.getElementById("restock-qty").value = "";
  document.getElementById("restock-preview").style.display = "none";
}

function selectRestockUnit(unitId, el) {
  selectedRestockUnit = unitId;
  document
    .querySelectorAll("#restock-units .unit-option")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  updateRestockPreview();
}

function updateRestockPreview() {
  const itemId = parseInt(document.getElementById("restock-item").value);
  const qty = parseFloat(document.getElementById("restock-qty").value) || 0;
  if (!itemId || !qty) {
    document.getElementById("restock-preview").style.display = "none";
    return;
  }
  const item = db.items.find((i) => i.id === itemId);
  const baseQty = toBaseUnits(item, selectedRestockUnit, qty);
  const prev = document.getElementById("restock-preview");
  prev.style.display = "block";
  prev.textContent = `✅ +${baseQty.toLocaleString()} ${item.base_unit} will be added. New stock: ${(item.stock_quantity + baseQty).toLocaleString()} ${item.base_unit}`;
}

function doRestock() {
  const itemId = parseInt(document.getElementById("restock-item").value);
  const qty = parseFloat(document.getElementById("restock-qty").value) || 0;
  if (!itemId || qty <= 0) {
    toast("Enter a valid quantity", "error");
    return;
  }

  const item = db.items.find((i) => i.id === itemId);
  const baseQty = toBaseUnits(item, selectedRestockUnit, qty);
  item.stock_quantity += baseQty;

  const restockEntry = {
    id: newId("restock_history"),
    date: new Date().toISOString(),
    item_id: item.id,
    item_name: item.item_name,
    unit: selectedRestockUnit,
    qty,
    base_qty: baseQty,
    base_unit: item.base_unit,
    note: document.getElementById("restock-note").value,
  };
  db.restock_history.unshift(restockEntry);

  const restockUnitLabel =
    getRestockUnitLabel(item.id, selectedRestockUnit) || item.base_unit;
  db.stock_logs.unshift({
    id: newId("stock_logs"),
    date: restockEntry.date,
    item_id: item.id,
    item_name: item.item_name,
    emoji: item.emoji || "📦",
    change_type: "restock",
    qty_change: baseQty,
    unit_label: restockUnitLabel,
    qty_display: qty,
    ref_id: restockEntry.id,
    note: restockEntry.note || "",
  });

  toast(
    `Restocked ${baseQty.toLocaleString()} ${item.base_unit} of ${item.item_name}`,
    "success",
  );
  persistDb();
  document.getElementById("restock-qty").value = "";
  document.getElementById("restock-note").value = "";
  updateRestockPreview();
  renderRestockHistory();
  renderPOSItems();
  bannerDismissed = false;
  updateLowStockAlerts();
  if (document.getElementById("page-stocklogs").classList.contains("active"))
    renderStockLogsPage();
}

function renderRestockHistory() {
  const el = document.getElementById("restock-history");
  if (!db.restock_history.length) {
    el.innerHTML =
      '<p class="helper" style="padding:8px 0;">No restocks yet.</p>';
    return;
  }
  el.innerHTML = db.restock_history
    .slice(0, 10)
    .map((r) => {
      const unitLabel =
        r.unit === "base"
          ? r.base_unit
          : getRestockUnitLabel(r.item_id, r.unit);
      return `<div class="restock-entry">
        <div class="restock-entry-header">
          <span class="restock-entry-title">${r.item_name}</span>
          <span class="badge badge-green">+${r.base_qty.toLocaleString()} ${r.base_unit}</span>
        </div>
        <div class="restock-entry-meta">${r.qty} ${unitLabel} · ${new Date(r.date).toLocaleString()}</div>
        ${r.note ? `<div class="restock-entry-note">${r.note}</div>` : ""}
      </div>`;
    })
    .join("");
}