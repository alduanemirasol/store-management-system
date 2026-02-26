// UI: Displays temporary notification message.
function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
// UI: Opens modal dialog by ID.
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
// UI: Closes modal dialog by ID.
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
// UI: Switches active page and updates navigation.
function showPage(pageId, event) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");
  if (event && event.target) event.target.classList.add("active");
  if (pageId === "restock") Logic.initRestockUI();
}
// Render: Draws item cards in POS grid.
function renderItemGrid(items) {
  const grid = document.getElementById("item-grid");
  if (!items.length) {
    grid.innerHTML =
      '<div class="empty" style="grid-column:1/-1">No items found</div>';
    return;
  }
  grid.innerHTML = items
    .map(
      (item) => `
    <div class="item-card" onclick="Logic.onItemCardClick(${item.id})">
      <div class="item-icon">${getCategoryIcon(item.category)}</div>
      <div class="item-name">${item.item_name}</div>
      <div class="item-price">${fmt(item.selling_price_per_unit)}/${item.base_unit}</div>
      <div class="item-stock">${fmtNum(item.stock_quantity)} ${item.base_unit}</div>
    </div>
  `,
    )
    .join("");
}
// Render: Builds sale modal body with options.
function renderSellModalBody(item, units, activePricing, selection) {
  let html = `
    <div style="margin-bottom:16px;font-size:13px;color:var(--text2)">
      Stock: <strong>${fmtNum(item.stock_quantity)} ${item.base_unit}</strong>
    </div>
    <div style="font-weight:700;font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">
      Sell By
    </div>
  `;
  html += _unitOptionHTML(
    `By ${item.base_unit} (base)`,
    `${fmt(item.selling_price_per_unit)} / ${item.base_unit}`,
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
    const selected =
      selection.type === "pricing" && selection.pricingId === p.id;
    html += _unitOptionHTML(
      `🏷️ ${p.title}`,
      `${fmt(p.price)} for ${p.quantity} ${item.base_unit}${p.note ? " · " + p.note : ""}`,
      selected,
      `Logic.onSellTypeSelect('pricing', null, ${p.id}, this)`,
    );
  });
  html += `
    <div class="divider"></div>
    <div class="form-group">
      <label>Quantity (how many of the selected unit)</label>
      <input type="number" id="sell-qty" value="${selection.qty || 1}"
             min="0.01" step="any" oninput="Logic.onSellQtyChange()">
    </div>
  `;
  if (item.allow_override) {
    html += `
      <div class="form-group">
        <label>Manual Price Override (₱) — leave blank to use default</label>
        <input type="number" id="sell-override" placeholder="Override price"
               min="0" step="0.01" oninput="Logic.onSellQtyChange()">
      </div>
    `;
  }
  html += `<div id="sell-preview" style="border-radius:var(--radius-sm);padding:12px;font-size:13px;font-weight:600;"></div>`;
  document.getElementById("sell-modal-title").textContent =
    `Add ${item.item_name}`;
  document.getElementById("sell-modal-body").innerHTML = html;
}
// Render: Returns HTML for unit option button.
function _unitOptionHTML(name, detail, isSelected, onclickHandler) {
  return `
    <div class="unit-option${isSelected ? " selected" : ""}" onclick="${onclickHandler}">
      <div class="unit-name">${name}</div>
      <div class="unit-detail">${detail}</div>
    </div>
  `;
}
// UI: Updates sale preview with total and stock warning.
function updateSellPreview(result, insufficientStock, stockMsg) {
  const prev = document.getElementById("sell-preview");
  if (!prev) return;
  if (insufficientStock) {
    prev.style.background = "var(--red-soft)";
    prev.style.color = "var(--red)";
    prev.textContent = `⚠ ${stockMsg}`;
  } else if (result) {
    prev.style.background = "var(--accent-soft)";
    prev.style.color = "var(--accent)";
    prev.textContent = `${result.label} → ${fmt(result.total)}`;
  } else {
    prev.textContent = "";
  }
}
// UI: Highlights selected unit option in modal.
function activateSellOption(clickedEl) {
  document.querySelectorAll("#sell-modal-body .unit-option").forEach((el) => {
    el.classList.remove("selected");
  });
  clickedEl.classList.add("selected");
}
// Render: Draws cart items and updates total.
function renderCart(cartItems, total) {
  const container = document.getElementById("cart-items");
  if (!cartItems.length) {
    container.innerHTML = '<div class="empty">No items yet</div>';
  } else {
    container.innerHTML = cartItems
      .map(
        (c, i) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${c.item_name}</div>
          <div class="cart-item-detail">${c.label}</div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="Logic.onRemoveCartItem(${i})">🗑</button>
          </div>
        </div>
        <div class="cart-item-price">${fmt(c.price)}</div>
      </div>
    `,
      )
      .join("");
  }
  document.getElementById("subtotal").textContent = fmt(total);
  document.getElementById("total").textContent = fmt(total);
  renderChangeDisplay(total);
}
// UI: Updates change amount display based on tendered.
function renderChangeDisplay(total) {
  const tendered = parseFloat(document.getElementById("tendered")?.value) || 0;
  const change = tendered - total;
  const el = document.getElementById("change-amt");
  if (!el) return;
  el.textContent = fmt(Math.max(0, change));
  el.className = change < 0 ? "font-bold text-red" : "font-bold text-green";
}
// Render: Displays receipt after successful checkout.
function showReceipt(txn) {
  const itemsHTML = txn.items
    .map(
      (i) => `
    <div class="receipt-item">
      <span>
        ${i.item_name}<br>
        <span style="font-size:11px;color:var(--text2)">${i.label}</span>
      </span>
      <span style="font-weight:700">${fmt(i.price)}</span>
    </div>
  `,
    )
    .join("");
  document.getElementById("receipt-body").innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:24px">🧾</div>
      <div style="font-weight:800;font-size:18px">MarketPOS</div>
      <div style="font-size:12px;color:var(--text2)">${txn.time.toLocaleString()}</div>
    </div>
    <div class="divider"></div>
    ${itemsHTML}
    <div class="divider"></div>
    <div class="receipt-item"><strong>Total</strong><strong>${fmt(txn.total)}</strong></div>
    <div class="receipt-item"><span>Tendered</span><span>${fmt(txn.tendered)}</span></div>
    <div class="receipt-item">
      <strong>Change</strong>
      <strong class="text-green">${fmt(txn.change)}</strong>
    </div>
  `;
  openModal("receipt-modal");
}
// Render: Draws inventory table with item data.
function renderInventoryTable(items) {
  const tbody = document.getElementById("inventory-table");
  if (!items.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty">No items found</td></tr>';
    return;
  }
  tbody.innerHTML = items
    .map((item) => {
      const units = getUnits(item.id);
      const stockLow = item.stock_quantity < 10;
      return `
      <tr>
        <td><div style="font-weight:700">${getCategoryIcon(item.category)} ${item.item_name}</div></td>
        <td><span class="badge badge-blue">${item.category}</span></td>
        <td>${item.base_unit}</td>
        <td>
          <span class="${stockLow ? "text-red font-bold" : "font-bold"}">${fmtNum(item.stock_quantity)}</span>
          <span class="text-muted text-sm"> ${item.base_unit}</span>
          ${stockLow ? '<span class="badge badge-red" style="margin-left:4px">Low</span>' : ""}
        </td>
        <td>${fmt(item.purchase_price_per_unit)}/${item.base_unit}</td>
        <td>${fmt(item.selling_price_per_unit)}/${item.base_unit}</td>
        <td><span class="text-sm text-muted">${units.length} variant${units.length !== 1 ? "s" : ""}</span></td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="Logic.onEditItem(${item.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Logic.onDeleteItem(${item.id})">Del</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}
// Render: Populates item form fields for add/edit.
function populateItemForm(item, units = []) {
  const isEdit = !!item;
  document.getElementById("add-item-title").textContent = isEdit
    ? "Edit Item"
    : "Add Item";
  document.getElementById("edit-item-id").value = isEdit ? item.id : "";
  document.getElementById("ai-name").value = isEdit ? item.item_name : "";
  document.getElementById("ai-cat").value = isEdit ? item.category : "Grains";
  document.getElementById("ai-unit").value = isEdit ? item.base_unit : "";
  document.getElementById("ai-stock").value = isEdit ? item.stock_quantity : "";
  document.getElementById("ai-buy").value = isEdit
    ? item.purchase_price_per_unit
    : "";
  document.getElementById("ai-sell").value = isEdit
    ? item.selling_price_per_unit
    : "";
  document.getElementById("ai-override").checked = isEdit
    ? item.allow_override || false
    : false;
  const list = document.getElementById("unit-variants-list");
  list.innerHTML = "";
  units.forEach((u) => addUnitVariantRow(u));
}
// Render: Adds new unit variant row to form.
function addUnitVariantRow(data = {}) {
  const row = document.createElement("div");
  row.className = "grid-2";
  row.style.cssText =
    "gap:8px;margin-bottom:8px;align-items:end;border:1px solid var(--border);border-radius:8px;padding:10px;";
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
    <div class="form-group" style="margin:0;grid-column:1/-1">
      <label>Note</label>
      <input class="uv-note" type="text" value="${data.note || ""}" placeholder="Optional note">
    </div>
    <div style="grid-column:1/-1">
      <button onclick="this.closest('.grid-2').remove()" class="btn btn-danger btn-sm">Remove</button>
    </div>
  `;
  document.getElementById("unit-variants-list").appendChild(row);
}
// Query: Reads all unit variant rows from form.
function readUnitVariantRows() {
  const rows = [];
  document.querySelectorAll("#unit-variants-list .grid-2").forEach((row) => {
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
// Query: Collects item form data into object.
function readItemForm() {
  return {
    id: document.getElementById("edit-item-id").value,
    item_name: document.getElementById("ai-name").value.trim(),
    category: document.getElementById("ai-cat").value,
    base_unit: document.getElementById("ai-unit").value.trim(),
    stock_quantity: parseFloat(document.getElementById("ai-stock").value) || 0,
    purchase_price_per_unit:
      parseFloat(document.getElementById("ai-buy").value) || 0,
    selling_price_per_unit:
      parseFloat(document.getElementById("ai-sell").value) || 0,
    allow_override: document.getElementById("ai-override").checked,
    units: readUnitVariantRows(),
  };
}
// Render: Populates restock item dropdown.
function populateRestockItemSelect(items) {
  const sel = document.getElementById("restock-item");
  sel.innerHTML =
    '<option value="">-- Choose item --</option>' +
    items
      .map((i) => `<option value="${i.id}">${i.item_name}</option>`)
      .join("");
  document.getElementById("restock-unit-section").style.display = "none";
}
// Render: Draws restock unit options for item.
function renderRestockUnits(item, units) {
  let html = `
    <div class="unit-option selected" onclick="Logic.onRestockUnitSelect('base', null, this)">
      <div class="unit-name">By ${item.base_unit}</div>
      <div class="unit-detail">${fmt(item.purchase_price_per_unit)} / ${item.base_unit}</div>
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
// UI: Highlights selected restock option.
function activateRestockOption(el) {
  document
    .querySelectorAll("#restock-units .unit-option")
    .forEach((e) => e.classList.remove("selected"));
  el.classList.add("selected");
}
// UI: Updates restock preview with calculations.
function updateRestockPreview(data) {
  const prev = document.getElementById("restock-preview");
  if (!data) {
    prev.style.display = "none";
    return;
  }
  prev.style.display = "block";
  prev.innerHTML = `Adding <strong>${data.label}</strong> → Stock goes to
    <strong>${fmtNum(data.newStock)} ${data.baseUnit}</strong><br>
    Estimated cost: <strong>${fmt(data.cost)}</strong>`;
}
// Render: Draws restock history table.
function renderRestockHistoryTable(history) {
  const tbody = document.getElementById("restock-history");
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No history</td></tr>';
    return;
  }
  tbody.innerHTML = history
    .map(
      (r) => `
    <tr>
      <td>${r.item_name}</td>
      <td>${r.unit}</td>
      <td>${r.qty}</td>
      <td class="text-green font-bold">+${fmtNum(r.base_units)}</td>
      <td class="text-sm text-muted">${r.time.toLocaleTimeString()}</td>
    </tr>
  `,
    )
    .join("");
}
// Render: Draws pricing rules table.
function renderPricingTable(rules) {
  const tbody = document.getElementById("pricing-table");
  if (!rules.length) {
    tbody.innerHTML =
      '<tr><td colspan="9" class="empty">No pricing rules</td></tr>';
    return;
  }
  tbody.innerHTML = rules
    .map((p) => {
      const item = getItem(p.item_id);
      const perUnit = p.quantity ? (p.price / p.quantity).toFixed(4) : "-";
      return `
      <tr>
        <td><strong>${item?.item_name || "?"}</strong></td>
        <td>${p.title}</td>
        <td>${p.quantity} ${item?.base_unit || ""}</td>
        <td><strong>${fmt(p.price)}</strong></td>
        <td class="text-muted text-sm">₱${perUnit}/${item?.base_unit}</td>
        <td><span class="badge ${p.active ? "badge-green" : "badge-red"}">${p.active ? "Active" : "Inactive"}</span></td>
        <td class="text-sm text-muted">${p.start_date || "—"} to ${p.end_date || "—"}</td>
        <td class="text-sm text-muted">${p.note || "—"}</td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="Logic.onTogglePricing(${p.id})">
              ${p.active ? "Deactivate" : "Activate"}
            </button>
            <button class="btn btn-danger btn-sm" onclick="Logic.onDeletePricing(${p.id})">Del</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}
// Render: Populates pricing item dropdown.
function populatePricingItemSelect(items) {
  document.getElementById("cp-item").innerHTML = items
    .map((i) => `<option value="${i.id}">${i.item_name}</option>`)
    .join("");
}
// Query: Reads pricing form data into object.
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
// UI: Resets pricing form to default values.
function resetPricingForm() {
  ["cp-title", "cp-qty", "cp-price", "cp-start", "cp-end", "cp-note"].forEach(
    (id) => {
      document.getElementById(id).value = "";
    },
  );
  document.getElementById("cp-active").checked = true;
}
// Render: Draws dashboard with stats and tables.
function renderDashboard(stats, recentTxns, inventoryStatus) {
  document.getElementById("d-sales").textContent = fmt(stats.todaySales);
  document.getElementById("d-transactions").textContent =
    `${stats.todayTransactions} transactions`;
  document.getElementById("d-items").textContent = stats.todayItems;
  document.getElementById("d-catalog").textContent = stats.catalogCount;
  document.getElementById("d-lowstock").textContent = stats.lowStockCount;
  const txnTbody = document.getElementById("txn-table");
  if (!recentTxns.length) {
    txnTbody.innerHTML =
      '<tr><td colspan="3" class="empty">No transactions</td></tr>';
  } else {
    txnTbody.innerHTML = recentTxns
      .map(
        (t) => `
      <tr>
        <td class="text-sm text-muted">${t.time.toLocaleTimeString()}</td>
        <td>${t.items.length} item${t.items.length !== 1 ? "s" : ""}</td>
        <td class="font-bold text-green">${fmt(t.total)}</td>
      </tr>
    `,
      )
      .join("");
  }
  document.getElementById("stock-table").innerHTML = inventoryStatus
    .map(
      ({ item, status }) => `
    <tr>
      <td>${getCategoryIcon(item.category)} ${item.item_name}</td>
      <td>${fmtNum(item.stock_quantity)} ${item.base_unit}</td>
      <td><span class="badge ${status.badgeClass}">${status.badgeText}</span></td>
    </tr>
  `,
    )
    .join("");
}
