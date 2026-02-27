// toast: Shows a temporary notification message.
function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// openModal: Opens a modal dialog by ID.
function openModal(id) {
  document.getElementById(id).classList.add("open");
}

// closeModal: Closes a modal dialog by ID.
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// showPage: Switches to a different page view.
function showPage(pageId, event) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");
  if (event && event.target) event.target.classList.add("active");
}

// renderItemGrid: Renders inventory items as a card grid.
function renderItemGrid(items) {
  const grid = document.getElementById("item-grid");
  if (!items.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">No products found</div>';
    return;
  }
  grid.innerHTML = items.map((item) => `
    <div class="item-card" onclick="Logic.onItemCardClick(${item.id})">
      <span class="item-icon">${getCategoryIcon(item.category)}</span>
      <div class="item-name">${item.item_name}</div>
      <div class="item-price">${fmt(item.selling_price_per_unit)}/${item.base_unit}</div>
      <div class="item-stock">${fmtNum(item.stock_quantity)} ${item.base_unit}</div>
    </div>
  `).join("");
}

// renderSellModalBody: Renders the sale modal with options.
function renderSellModalBody(item, units, activePricing, selection) {
  let html = `
    <div style="margin-bottom:16px; padding:12px 14px; background:var(--cream2); border-radius:var(--radius-sm); border:1px solid var(--border); font-size:14px; color:var(--text2)">
      Available stock: <strong style="color:var(--text)">${fmtNum(item.stock_quantity)} ${item.base_unit}</strong>
    </div>
    <div style="font-weight:700; font-size:12px; color:var(--text3); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">Sell By</div>
  `;

  html += _unitOptionHTML(
    `By ${item.base_unit}`,
    `${fmt(item.selling_price_per_unit)} per ${item.base_unit}`,
    selection.type === "base",
    `Logic.onSellTypeSelect('base', null, null, this)`,
  );

  units.forEach((u) => {
    const selected = selection.type === "unit" && selection.unitId === u.id;
    html += _unitOptionHTML(
      u.unit_name,
      `${fmt(u.selling_price)} · ${u.pack_quantity} ${item.base_unit}${u.note ? " · " + u.note : ""}`,
      selected,
      `Logic.onSellTypeSelect('unit', ${u.id}, null, this)`,
    );
  });

  activePricing.forEach((p) => {
    const selected = selection.type === "pricing" && selection.pricingId === p.id;
    html += _unitOptionHTML(
      `🏷 ${p.title}`,
      `${fmt(p.price)} for ${p.quantity} ${item.base_unit}${p.note ? " · " + p.note : ""}`,
      selected,
      `Logic.onSellTypeSelect('pricing', null, ${p.id}, this)`,
    );
  });

  html += `
    <div class="divider"></div>
    <div class="form-group">
      <label>Quantity</label>
      <input type="number" id="sell-qty" value="${selection.qty || 1}" min="0.01" step="any" oninput="Logic.onSellQtyChange()">
    </div>
  `;

  if (item.allow_override) {
    html += `
      <div class="form-group">
        <label>Manual Price Override (₱) — leave blank for default</label>
        <input type="number" id="sell-override" placeholder="Override price" min="0" step="0.01" oninput="Logic.onSellQtyChange()">
      </div>
    `;
  }

  html += `<div id="sell-preview" style="border-radius:var(--radius-sm); padding:12px 14px; font-size:14px; font-weight:600;"></div>`;

  document.getElementById("sell-modal-title").textContent = `Add ${item.item_name}`;
  document.getElementById("sell-modal-body").innerHTML = html;
}

// _unitOptionHTML: Generates HTML for a unit option button.
function _unitOptionHTML(name, detail, isSelected, onclickHandler) {
  return `
    <div class="unit-option${isSelected ? " selected" : ""}" onclick="${onclickHandler}">
      <div class="unit-name">${name}</div>
      <div class="unit-detail">${detail}</div>
    </div>
  `;
}

// updateSellPreview: Updates the sale preview display with calculations.
function updateSellPreview(result, insufficientStock, stockMsg) {
  const prev = document.getElementById("sell-preview");
  if (!prev) return;

  if (insufficientStock) {
    prev.style.background = "var(--red-soft)";
    prev.style.color = "var(--red)";
    prev.style.border = "1px solid rgba(192,57,43,0.18)";
    prev.textContent = `⚠ ${stockMsg}`;
  } else if (result) {
    prev.style.background = "var(--forest-soft)";
    prev.style.color = "var(--forest)";
    prev.style.border = "1px solid rgba(30,77,58,0.15)";
    prev.textContent = `${result.label} → ${fmt(result.total)}`;
  } else {
    prev.textContent = "";
    prev.style.background = "";
    prev.style.border = "";
  }
}

// activateSellOption: Highlights the selected sell option.
function activateSellOption(clickedEl) {
  document.querySelectorAll("#sell-modal-body .unit-option").forEach((el) => el.classList.remove("selected"));
  clickedEl.classList.add("selected");
}

// renderCart: Renders the shopping cart items and totals.
function renderCart(cartItems, total) {
  const container = document.getElementById("cart-items");

  if (!cartItems.length) {
    container.innerHTML = '<div class="empty">No items in order</div>';
  } else {
    container.innerHTML = cartItems.map((c, i) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${c.item_name}</div>
          <div class="cart-item-detail">${c.label}</div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="Logic.onRemoveCartItem(${i})" title="Remove">✕</button>
          </div>
        </div>
        <div class="cart-item-price">${fmt(c.price)}</div>
      </div>
    `).join("");
  }

  document.getElementById("subtotal").textContent = fmt(total);
  document.getElementById("total").textContent = fmt(total);
  renderChangeDisplay(total);
}

// renderChangeDisplay: Updates the change amount display.
function renderChangeDisplay(total) {
  const tendered = parseFloat(document.getElementById("tendered")?.value) || 0;
  const change = tendered - total;
  const el = document.getElementById("change-amt");
  if (!el) return;
  el.textContent = fmt(Math.max(0, change));
  el.className = change < 0 ? "font-bold text-red" : "font-bold text-green";
}

// showReceipt: Displays the transaction receipt modal.
function showReceipt(txn) {
  const itemsHTML = txn.items.map((i) => `
    <div class="receipt-item">
      <span>
        <strong>${i.item_name}</strong><br>
        <span style="font-size:11px; color:var(--text2)">${i.label}</span>
      </span>
      <span style="font-weight:700; color:var(--forest)">${fmt(i.price)}</span>
    </div>
  `).join("");

  document.getElementById("receipt-body").innerHTML = `
    <div style="text-align:center; margin-bottom:20px; padding-bottom:16px; border-bottom:2px dashed var(--border)">
      <div style="font-size:28px; margin-bottom:6px">🧾</div>
      <div style="font-family:'Inter',sans-serif; font-weight:800; font-size:22px; color:var(--forest); letter-spacing:-0.5px">Market POS</div>
      <div style="font-size:12px; color:var(--text3); margin-top:3px; letter-spacing:0.5px">Sales & Inventory</div>
      <div style="font-size:12px; color:var(--text2); margin-top:6px">${txn.time.toLocaleString()}</div>
    </div>
    ${itemsHTML}
    <div style="padding-top:12px; margin-top:4px; border-top:2px solid var(--border)">
      <div class="receipt-item"><strong>Total</strong><strong style="color:var(--forest)">${fmt(txn.total)}</strong></div>
      <div class="receipt-item"><span style="color:var(--text2)">Tendered</span><span>${fmt(txn.tendered)}</span></div>
      <div class="receipt-item" style="border:none">
        <strong>Change</strong>
        <strong class="text-green">${fmt(txn.change)}</strong>
      </div>
    </div>
  `;
  openModal("receipt-modal");
}

// renderInventoryTable: Renders the inventory management table.
function renderInventoryTable(items) {
  const tbody = document.getElementById("inventory-table");
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">No items found</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((item) => {
    const units = getUnits(item.id);
    const stockLow = item.stock_quantity < 10;
    return `
      <tr>
        <td><div style="font-weight:700; font-size:15px; color:var(--text)">${getCategoryIcon(item.category)} ${item.item_name}</div></td>
        <td><span class="badge badge-blue">${item.category}</span></td>
        <td style="color:var(--text2); font-size:14px">${item.base_unit}</td>
        <td>
          <span class="${stockLow ? "text-red font-bold" : "font-bold"}" style="font-size:14px">${fmtNum(item.stock_quantity)}</span>
          <span class="text-muted" style="font-size:13px"> ${item.base_unit}</span>
          ${stockLow ? '<span class="badge badge-red" style="margin-left:5px">Low</span>' : ""}
        </td>
        <td style="color:var(--text2); font-size:14px">${fmt(item.purchase_price_per_unit)}/${item.base_unit}</td>
        <td style="font-weight:600; color:var(--forest); font-size:14px">${fmt(item.selling_price_per_unit)}/${item.base_unit}</td>
        <td><span style="font-size:13px; color:var(--text2)">${units.length} variant${units.length !== 1 ? "s" : ""}</span></td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="Logic.onEditItem(${item.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Logic.onDeleteItem(${item.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// populateItemForm: Fills the add/edit item form with data.
function populateItemForm(item, units = []) {
  const isEdit = !!item;
  document.getElementById("add-item-title").textContent = isEdit ? "Edit Item" : "Add Item";
  document.getElementById("edit-item-id").value = isEdit ? item.id : "";
  document.getElementById("ai-name").value = isEdit ? item.item_name : "";
  document.getElementById("ai-cat").value = isEdit ? item.category : "Grains";
  document.getElementById("ai-stock").value = isEdit ? item.stock_quantity : "";
  document.getElementById("ai-buy").value = isEdit ? item.purchase_price_per_unit : "";
  document.getElementById("ai-sell").value = isEdit ? item.selling_price_per_unit : "";
  document.getElementById("ai-override").checked = isEdit ? item.allow_override || false : false;

  const unitSel = document.getElementById("ai-unit");
  const unitCustom = document.getElementById("ai-unit-custom");
  if (isEdit && item.base_unit) {
    const knownOpt = Array.from(unitSel.options).find((o) => o.value === item.base_unit);
    if (knownOpt) {
      unitSel.value = item.base_unit;
      unitCustom.style.display = "none";
      unitCustom.value = "";
    } else {
      unitSel.value = "custom";
      unitCustom.style.display = "block";
      unitCustom.value = item.base_unit;
    }
  } else {
    unitSel.value = "";
    unitCustom.style.display = "none";
    unitCustom.value = "";
  }

  const list = document.getElementById("unit-variants-list");
  list.innerHTML = "";
  units.forEach((u) => addUnitVariantRow(u));
}

// addUnitVariantRow: Adds a new unit variant row to the form.
function addUnitVariantRow(data = {}) {
  const row = document.createElement("div");
  row.className = "grid-2 unit-variant-row";
  row.setAttribute("data-unit-id", data.id || "");
  row.innerHTML = `
    <div class="form-group" style="margin:0">
      <label>Unit Name</label>
      <input class="uv-name" type="text" value="${data.unit_name || ""}" placeholder="e.g., Sack">
    </div>
    <div class="form-group" style="margin:0">
      <label>Pack Qty (base units)</label>
      <input class="uv-pack" type="number" value="${data.pack_quantity || ""}" placeholder="e.g., 50" min="1" step="any">
    </div>
    <div class="form-group" style="margin:0">
      <label>Purchase Price</label>
      <input class="uv-buy" type="number" value="${data.purchase_price || ""}" placeholder="0.00" min="0" step="0.01">
    </div>
    <div class="form-group" style="margin:0">
      <label>Sell Price</label>
      <input class="uv-sell" type="number" value="${data.selling_price || ""}" placeholder="0.00" min="0" step="0.01">
    </div>
    <div class="form-group" style="margin:0; grid-column:1/-1">
      <label>Note</label>
      <input class="uv-note" type="text" value="${data.note || ""}" placeholder="Optional note">
    </div>
    <div style="grid-column:1/-1">
      <button onclick="this.closest('.unit-variant-row').remove()" class="btn btn-danger btn-sm">Remove</button>
    </div>
  `;
  document.getElementById("unit-variants-list").appendChild(row);
}

// readUnitVariantRows: Reads all unit variant rows from the form.
function readUnitVariantRows() {
  const rows = [];
  document.querySelectorAll("#unit-variants-list .unit-variant-row").forEach((row) => {
    rows.push({
      unit_name: row.querySelector(".uv-name").value.trim(),
      pack_quantity: parseFloat(row.querySelector(".uv-pack").value) || 1,
      purchase_price: parseFloat(row.querySelector(".uv-buy").value) || 0,
      selling_price: parseFloat(row.querySelector(".uv-sell").value) || 0,
      note: row.querySelector(".uv-note").value.trim(),
    });
  });
  return rows;
}

// readItemForm: Reads all form fields into an item object.
function readItemForm() {
  const unitSel = document.getElementById("ai-unit");
  const unitCustom = document.getElementById("ai-unit-custom");
  const base_unit = unitSel.value === "custom"
    ? unitCustom.value.trim()
    : unitSel.value.trim();

  return {
    id: document.getElementById("edit-item-id").value,
    item_name: document.getElementById("ai-name").value.trim(),
    category: document.getElementById("ai-cat").value,
    base_unit,
    stock_quantity: parseFloat(document.getElementById("ai-stock").value) || 0,
    purchase_price_per_unit: parseFloat(document.getElementById("ai-buy").value) || 0,
    selling_price_per_unit: parseFloat(document.getElementById("ai-sell").value) || 0,
    allow_override: document.getElementById("ai-override").checked,
    units: readUnitVariantRows(),
  };
}

// handleBaseUnitChange: Toggles custom unit input visibility.
function handleBaseUnitChange(sel) {
  const customInput = document.getElementById("ai-unit-custom");
  if (sel.value === "custom") {
    customInput.style.display = "block";
    customInput.focus();
  } else {
    customInput.style.display = "none";
    customInput.value = "";
  }
}

// populateRestockItemSelect: Populates the restock item dropdown.
function populateRestockItemSelect(items) {
  const sel = document.getElementById("restock-item");
  sel.innerHTML =
    '<option value="">— Choose an item —</option>' +
    items.map((i) => `<option value="${i.id}">${i.item_name}</option>`).join("");
  document.getElementById("restock-unit-section").style.display = "none";
}

// renderRestockUnits: Renders unit options for restocking.
function renderRestockUnits(item, units) {
  let html = `
    <div class="unit-option selected" onclick="Logic.onRestockUnitSelect('base', null, this)">
      <div class="unit-name">By ${item.base_unit}</div>
      <div class="unit-detail">${fmt(item.purchase_price_per_unit)} per ${item.base_unit}</div>
    </div>
  `;
  units.forEach((u) => {
    html += `
      <div class="unit-option" onclick="Logic.onRestockUnitSelect('unit', ${u.id}, this)">
        <div class="unit-name">${u.unit_name}</div>
        <div class="unit-detail">${fmt(u.purchase_price)} · ${u.pack_quantity} ${item.base_unit}</div>
      </div>
    `;
  });
  document.getElementById("restock-units").innerHTML = html;
  document.getElementById("restock-unit-section").style.display = "block";
  document.getElementById("restock-qty").value = "";
  document.getElementById("restock-preview").style.display = "none";
}

// activateRestockOption: Highlights the selected restock option.
function activateRestockOption(el) {
  document.querySelectorAll("#restock-units .unit-option").forEach((e) => e.classList.remove("selected"));
  el.classList.add("selected");
}

// updateRestockPreview: Updates restock calculation preview.
function updateRestockPreview(data) {
  const prev = document.getElementById("restock-preview");
  if (!data) {
    prev.style.display = "none";
    return;
  }
  prev.style.display = "block";
  prev.innerHTML = `Adding <strong>${data.label}</strong> → stock will be
    <strong>${fmtNum(data.newStock)} ${data.baseUnit}</strong><br>
    Estimated cost: <strong>${fmt(data.cost)}</strong>`;
}

// renderRestockHistoryTable: Renders restock history table.
function renderRestockHistoryTable(history) {
  const tbody = document.getElementById("restock-history");
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No history yet</td></tr>';
    return;
  }
  tbody.innerHTML = history.map((r) => `
    <tr>
      <td style="font-weight:600; font-size:14px">${r.item_name}</td>
      <td style="color:var(--text2); font-size:14px">${r.unit}</td>
      <td style="font-size:14px">${r.qty}</td>
      <td class="text-green font-bold" style="font-size:14px">+${fmtNum(r.base_units)}</td>
      <td style="font-size:13px; color:var(--text2)">${r.time.toLocaleTimeString()}</td>
    </tr>
  `).join("");
}

// renderPricingTable: Renders custom pricing rules table.
function renderPricingTable(rules) {
  const tbody = document.getElementById("pricing-table");
  if (!rules.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">No pricing rules</td></tr>';
    return;
  }
  tbody.innerHTML = rules.map((p) => {
    const item = getItem(p.item_id);
    const perUnit = p.quantity ? (p.price / p.quantity).toFixed(4) : "-";
    return `
      <tr>
        <td style="font-weight:700; font-size:14px">${item?.item_name || "?"}</td>
        <td style="font-size:14px">${p.title}</td>
        <td style="color:var(--text2); font-size:14px">${p.quantity} ${item?.base_unit || ""}</td>
        <td style="font-weight:700; color:var(--forest); font-size:14px">${fmt(p.price)}</td>
        <td style="color:var(--text2); font-size:13px">₱${perUnit}/${item?.base_unit}</td>
        <td><span class="badge ${p.active ? "badge-green" : "badge-red"}">${p.active ? "Active" : "Inactive"}</span></td>
        <td style="font-size:13px; color:var(--text2)">${p.start_date || "—"} to ${p.end_date || "—"}</td>
        <td style="font-size:13px; color:var(--text2)">${p.note || "—"}</td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="Logic.onTogglePricing(${p.id})">${p.active ? "Deactivate" : "Activate"}</button>
            <button class="btn btn-danger btn-sm" onclick="Logic.onDeletePricing(${p.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// populatePricingItemSelect: Populates pricing item dropdown.
function populatePricingItemSelect(items) {
  document.getElementById("cp-item").innerHTML = items
    .map((i) => `<option value="${i.id}">${i.item_name}</option>`)
    .join("");
}

// readPricingForm: Reads pricing form fields into an object.
function readPricingForm() {
  return {
    item_id: parseInt(document.getElementById("cp-item").value),
    title: document.getElementById("cp-title").value.trim(),
    quantity: parseFloat(document.getElementById("cp-qty").value),
    price: parseFloat(document.getElementById("cp-price").value),
    note: document.getElementById("cp-note").value.trim(),
    active: document.getElementById("cp-active").checked,
    start_date: document.getElementById("cp-start").value,
    end_date: document.getElementById("cp-end").value,
  };
}

// resetPricingForm: Clears all pricing form fields.
function resetPricingForm() {
  ["cp-title", "cp-qty", "cp-price", "cp-start", "cp-end", "cp-note"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("cp-active").checked = true;
}

// renderDashboard: Renders dashboard stats and tables.
function renderDashboard(stats, recentTxns, inventoryStatus) {
  document.getElementById("d-sales").textContent = fmt(stats.todaySales);
  document.getElementById("d-transactions").textContent = `${stats.todayTransactions} transactions`;
  document.getElementById("d-items").textContent = stats.todayItems;
  document.getElementById("d-catalog").textContent = stats.catalogCount;
  document.getElementById("d-lowstock").textContent = stats.lowStockCount;

  const txnTbody = document.getElementById("txn-table");
  txnTbody.innerHTML = !recentTxns.length
    ? '<tr><td colspan="3" class="empty">No transactions today</td></tr>'
    : recentTxns.map((t) => `
        <tr>
          <td style="font-size:13px; color:var(--text2)">${t.time.toLocaleTimeString()}</td>
          <td style="font-size:14px">${t.items.length} item${t.items.length !== 1 ? "s" : ""}</td>
          <td class="font-bold text-green" style="font-size:14px">${fmt(t.total)}</td>
        </tr>
      `).join("");

  document.getElementById("stock-table").innerHTML = inventoryStatus.map(({ item, status }) => `
    <tr>
      <td style="font-weight:500; font-size:14px">${getCategoryIcon(item.category)} ${item.item_name}</td>
      <td style="font-size:14px">${fmtNum(item.stock_quantity)} ${item.base_unit}</td>
      <td><span class="badge ${status.badgeClass}">${status.badgeText}</span></td>
    </tr>
  `).join("");
}
