/**
 * reports.js
 * Transactions, Recent Sales, Stock Logs — rewritten for new schema.
 *
 * Schema mappings:
 *   Old: db.transactions[]        → New: db.sales[] + db.sale_items[]
 *   Old: db.stock_logs[]          → New: db.stock_movements[] + db.stock_log_reasons[]
 *   Old: txn.total                → New: SUM(sale_items.quantity * sale_items.unit_price)
 *   Old: txn.items[].item_name    → New: sale_items._product_name (UI cache) or products.name
 */

function formatDate(d) {
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function relativeTimeFrom(d) {
  const diffMin = Math.floor((new Date() - d) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return diffMin + "m ago";
  if (diffMin < 1440) return Math.floor(diffMin / 60) + "h ago";
  return Math.floor(diffMin / 1440) + "d ago";
}

function getDateRangeFilter(filterVal) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { today: startOfDay, week: startOfWeek, month: startOfMonth }[filterVal] || null;
}

/**
 * Compute the total for a sale from its sale_items.
 * Schema rule: no total_amount column — always compute as SUM(quantity * unit_price).
 */
function getSaleTotal(saleId) {
  return db.sale_items
    .filter((si) => si.sale_id === saleId)
    .reduce((sum, si) => sum + si.quantity * si.unit_price, 0);
}

// ─── Transactions page ────────────────────────────────────────────────────────

function renderTransactions() {
  const allSales = db.sales;
  const total = allSales.reduce((s, sale) => s + getSaleTotal(sale.id), 0);
  const today = new Date().toDateString();
  const todaySales = allSales.filter((s) => new Date(s.sale_date).toDateString() === today);
  const todayTotal = todaySales.reduce((s, sale) => s + getSaleTotal(sale.id), 0);

  document.getElementById("txn-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Total Transactions</div>
      <div class="stat-value">${allSales.length}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₱${formatPeso(total, 0)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Today's Sales</div>
      <div class="stat-value">${todaySales.length}</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Today's Revenue</div>
      <div class="stat-value">₱${formatPeso(todayTotal, 0)}</div>
    </div>
  `;

  const tbody = document.getElementById("txn-tbody");
  if (!allSales.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="page-empty">No transactions yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = allSales.map((sale) => {
    const saleItems = db.sale_items.filter((si) => si.sale_id === sale.id);
    const saleTotal = getSaleTotal(sale.id);
    const d = new Date(sale.sale_date);
    const payType = db.payment_types.find((pt) => pt.id === sale.payment_type_id);

    return `<tr>
      <td><strong>#${String(sale.id).padStart(4, "0")}</strong></td>
      <td>
        <div>${formatDate(d)}</div>
        <div style="font-size:11px;color:var(--text3);">${formatTime(d)}</div>
      </td>
      <td>
        <span>${saleItems.length} item${saleItems.length !== 1 ? "s" : ""}</span>
        <span style="color:var(--text3);font-size:12px;"> — ${saleItems.map((si) => si._product_name || "").join(", ")}</span>
      </td>
      <td>
        <strong>₱${formatPeso(saleTotal)}</strong>
        ${payType ? `<br><span style="font-size:11px;color:var(--text3);">${payType.name}</span>` : ""}
      </td>
      <td><button class="btn btn-secondary btn-sm" onclick="viewTxnDetail(${sale.id})">View</button></td>
    </tr>`;
  }).join("");
}

function viewTxnDetail(saleId) {
  const sale = db.sales.find((s) => s.id === saleId);
  if (!sale) return;
  const d = new Date(sale.sale_date);
  const saleItems = db.sale_items.filter((si) => si.sale_id === saleId);
  const saleTotal = getSaleTotal(saleId);
  const payType = db.payment_types.find((pt) => pt.id === sale.payment_type_id);

  document.getElementById("txn-detail-body").innerHTML = `
    <div style="margin-bottom:14px;">
      <strong>Transaction #${String(sale.id).padStart(4, "0")}</strong><br>
      <span style="color:var(--text3);font-size:12px;">${d.toLocaleString()}</span>
      ${payType ? ` · <span style="color:var(--text3);font-size:12px;">${payType.name}</span>` : ""}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Item</th>
          <th>Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total</th>
        </tr></thead>
        <tbody>
          ${saleItems.map((si) => {
    const lineTotal = si.quantity * si.unit_price;
    return `<tr>
              <td>${si._emoji || "📦"} ${si._product_name || ""}
                ${si.is_manual_priced ? '<span class="manual-badge">✏️ manual</span>' : ""}
              </td>
              <td style="color:var(--text3);font-size:12px;">${si.quantity} ${si._unit_label || ""}</td>
              <td style="text-align:right;">₱${formatPeso(si.unit_price)}</td>
              <td style="text-align:right;font-weight:600;">₱${formatPeso(lineTotal)}</td>
            </tr>`;
  }).join("")}
        </tbody>
      </table>
    </div>
    <div style="text-align:right;margin-top:14px;padding-top:10px;border-top:2px solid var(--border);">
      <strong style="font-size:18px;">Total: ₱${formatPeso(saleTotal)}</strong>
    </div>
  `;
  openModal("modal-txn-detail");
}

// ─── Recent Sales page ────────────────────────────────────────────────────────

function renderRecentSalesPage() {
  const searchQ = (document.getElementById("rs-search")?.value || "").toLowerCase();
  const dateFilter = document.getElementById("rs-filter-date")?.value || "all";
  const since = getDateRangeFilter(dateFilter);

  // Flatten all sale_items into rows with sale date
  let rows = [];
  db.sales.forEach((sale) => {
    const saleDate = new Date(sale.sale_date);
    db.sale_items
      .filter((si) => si.sale_id === sale.id)
      .forEach((si) => rows.push({ ...si, saleDate, saleId: sale.id }));
  });

  if (since) rows = rows.filter((r) => r.saleDate >= since);
  if (searchQ) rows = rows.filter((r) => (r._product_name || "").toLowerCase().includes(searchQ));
  rows.sort((a, b) => b.saleDate - a.saleDate);

  const totalRevenue = rows.reduce((s, r) => s + r.quantity * r.unit_price, 0);
  const uniqueItems = new Set(rows.map((r) => r._product_name)).size;
  const totalQty = rows.reduce((s, r) => s + (r.quantity || 0), 0);

  document.getElementById("rs-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Line Items Sold</div>
      <div class="stat-value">${rows.length}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₱${formatPeso(totalRevenue, 0)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Unique Items</div>
      <div class="stat-value">${uniqueItems}</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Total Units Sold</div>
      <div class="stat-value">${totalQty % 1 === 0 ? totalQty : totalQty.toFixed(2)}</div>
    </div>
  `;

  const tbody = document.getElementById("rs-tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="page-empty">No sales found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r) => {
    const lineTotal = r.quantity * r.unit_price;
    const d = r.saleDate;
    return `<tr>
      <td>
        <strong>${r._emoji || "📦"} ${r._product_name || ""}</strong>
        ${r.is_manual_priced ? '<span class="manual-badge">✏️ manual</span>' : ""}
      </td>
      <td>
        ${r.quantity}
        <span style="color:var(--text3);font-size:12px;">${r._unit_label || ""}</span>
      </td>
      <td><strong style="color:var(--green);">₱${formatPeso(lineTotal)}</strong></td>
      <td>
        <div>${formatDate(d)}</div>
        <div style="font-size:11px;color:var(--text3);">${formatTime(d)} · ${relativeTimeFrom(d)}</div>
      </td>
      <td><span class="badge badge-blue">#${String(r.saleId).padStart(4, "0")}</span></td>
    </tr>`;
  }).join("");
}

// ─── Stock Logs page ──────────────────────────────────────────────────────────

function renderStockLogsPage() {
  const searchQ = (document.getElementById("sl-search")?.value || "").toLowerCase();
  const reasonFilter = document.getElementById("sl-filter-reason")?.value || "all";
  const dateFilter = document.getElementById("sl-filter-date")?.value || "all";
  const since = getDateRangeFilter(dateFilter);

  const reasonMap = {};
  db.stock_log_reasons.forEach((r) => { reasonMap[r.id] = r.name; });

  let logs = [...db.stock_movements];

  if (since) logs = logs.filter((l) => new Date(l.created_at) >= since);
  if (reasonFilter !== "all") {
    logs = logs.filter((l) => l.stock_log_reason_id === parseInt(reasonFilter));
  }
  if (searchQ) {
    logs = logs.filter((l) => {
      const product = db.products.find((p) => p.id === l.product_id);
      return product && product.name.toLowerCase().includes(searchQ);
    });
  }

  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const purchaseReasonId = db.stock_log_reasons.find((r) => r.name === "Purchase")?.id;
  const saleReasonId = db.stock_log_reasons.find((r) => r.name === "Sale")?.id;

  const totalIn = logs.filter(l => l.quantity_changed > 0).reduce((s, l) => s + l.quantity_changed, 0);
  const totalOut = logs.filter(l => l.quantity_changed < 0).reduce((s, l) => s + Math.abs(l.quantity_changed), 0);
  const netChange = totalIn - totalOut;

  document.getElementById("sl-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Total Entries</div>
      <div class="stat-value">${logs.length}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Total In</div>
      <div class="stat-value">+${parseFloat(totalIn.toFixed(2)).toLocaleString()}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Total Out</div>
      <div class="stat-value">−${parseFloat(totalOut.toFixed(2)).toLocaleString()}</div>
    </div>
    <div class="stat-card ${netChange >= 0 ? "green" : "red"}">
      <div class="stat-label">Net Change</div>
      <div class="stat-value">${netChange >= 0 ? "+" : ""}${parseFloat(netChange.toFixed(2)).toLocaleString()}</div>
    </div>
  `;

  const tbody = document.getElementById("sl-tbody");
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="page-empty">
      <div style="padding:32px 0;">
        <div style="font-size:36px;margin-bottom:10px;">📋</div>
        <div style="font-weight:600;color:var(--text2);font-size:15px;">No stock logs found</div>
        <div style="font-size:13px;color:var(--text3);margin-top:4px;">Try adjusting your filters or log a stock change</div>
      </div>
    </td></tr>`;
    return;
  }

  // Badge colours per reason
  const reasonBadge = {
    "Purchase": "badge-green",
    "Sale": "badge-orange",
    "Return": "badge-blue",
    "Damage": "badge-red",
    "Recount": "badge-yellow",
    "Sample": "badge-yellow",
    "Adjustment": "badge-blue",
  };
  const reasonIcon = {
    "Purchase": "📦", "Sale": "🛒", "Return": "↩️",
    "Damage": "💥", "Recount": "🔢", "Sample": "🧪", "Adjustment": "⚙️",
  };

  tbody.innerHTML = logs.map((l) => {
    const d = new Date(l.created_at);
    const product = db.products.find((p) => p.id === l.product_id);
    const productName = product ? `${product.emoji || "📦"} ${product.name}` : `Product #${l.product_id}`;
    const baseUnitName = product ? getProductBaseUnitName(product) : "";
    const reasonName = reasonMap[l.stock_log_reason_id] || "Unknown";
    const badgeCls = reasonBadge[reasonName] || "badge-blue";
    const icon = reasonIcon[reasonName] || "📋";

    const isPositive = l.quantity_changed >= 0;
    const qtyColor = isPositive ? "var(--green)" : "var(--red)";
    const qtySign = isPositive ? "+" : "−";

    const expiryDisplay = l.expiry_date
      ? (() => {
        const exp = new Date(l.expiry_date + "T00:00:00");
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((exp - today) / 86400000);
        const expired = daysLeft < 0;
        const soon = daysLeft >= 0 && daysLeft <= 30;
        const color = expired ? "var(--red)" : soon ? "var(--orange)" : "var(--text2)";
        const tag = expired ? " (Expired)" : soon ? ` (${daysLeft}d)` : "";
        return `<span style="font-size:13px;font-weight:600;color:${color};">${l.expiry_date}${tag}</span>`;
      })()
      : `<span style="color:var(--text3);font-size:13px;">—</span>`;

    return `<tr>
      <td><strong>${productName}</strong></td>
      <td>
        <span style="color:${qtyColor};font-weight:700;font-size:15px;">${qtySign}${formatQty(Math.abs(l.quantity_changed))}</span>
        <span style="font-size:12px;color:var(--text3);margin-left:3px;">${baseUnitName}</span>
      </td>
      <td><span class="badge ${badgeCls}">${icon} ${reasonName}</span></td>
      <td>${expiryDisplay}</td>
      <td style="font-size:13px;color:var(--text2);max-width:200px;">${l.notes || "<span style='color:var(--text3)'>—</span>"}</td>
      <td>
        <div style="font-size:13px;font-weight:600;">${formatDate(d)}</div>
        <div style="font-size:11px;color:var(--text3);">${formatTime(d)} · ${relativeTimeFrom(d)}</div>
      </td>
    </tr>`;
  }).join("");
}

// ─── Log Stock Change modal ───────────────────────────────────────────────────

function openLogStockChangeModal() {
  // Populate product dropdown
  const sel = document.getElementById("sl-log-product");
  sel.innerHTML =
    '<option value="">— Select product —</option>' +
    db.products
      .filter((p) => !p.is_deleted)
      .map((p) => `<option value="${p.id}">${p.emoji || "📦"} ${p.name}</option>`)
      .join("");

  // Reset fields
  document.getElementById("sl-log-reason").value = "";
  document.getElementById("sl-log-direction").value = "+";
  document.getElementById("sl-log-qty").value = "";
  document.getElementById("sl-log-expiry").value = "";
  document.getElementById("sl-log-notes").value = "";
  document.getElementById("sl-log-unit-suffix").textContent = "";
  document.getElementById("sl-log-stock-preview").style.display = "none";

  onLogStockReasonChange(); // set expiry label correctly
  openModal("modal-log-stock");
}

function onLogStockProductChange() {
  updateLogStockPreview();
  const productId = parseInt(document.getElementById("sl-log-product").value);
  const suffix = document.getElementById("sl-log-unit-suffix");
  if (!productId) { suffix.textContent = ""; return; }
  const product = db.products.find((p) => p.id === productId);
  suffix.textContent = product ? getProductBaseUnitName(product) : "";
}

function onLogStockReasonChange() {
  const reasonId = parseInt(document.getElementById("sl-log-reason").value);
  const isPurchase = reasonId === 1;  // Purchase
  const isSale = reasonId === 2;  // Sale

  // Auto-set direction
  const dirSel = document.getElementById("sl-log-direction");
  if (isPurchase || reasonId === 3 /* Return */) dirSel.value = "+";
  else if (isSale || reasonId === 4 /* Damage */ || reasonId === 6 /* Sample */) dirSel.value = "-";

  // Expiry label
  const requiredMark = document.getElementById("sl-log-expiry-required");
  const hint = document.getElementById("sl-log-expiry-hint");
  requiredMark.textContent = isPurchase ? " *" : "";
  hint.textContent = isPurchase
    ? "Required for Purchase restocks."
    : "Leave blank if not applicable.";

  updateLogStockPreview();
}

function updateLogStockPreview() {
  const productId = parseInt(document.getElementById("sl-log-product").value);
  const qty = parseFloat(document.getElementById("sl-log-qty").value) || 0;
  const direction = document.getElementById("sl-log-direction").value;
  const preview = document.getElementById("sl-log-stock-preview");

  if (!productId || qty <= 0) { preview.style.display = "none"; return; }

  const product = db.products.find((p) => p.id === productId);
  if (!product) { preview.style.display = "none"; return; }

  const stockRow = getProductStock(productId);
  const currentQty = stockRow ? stockRow.quantity : 0;
  const delta = direction === "+" ? qty : -qty;
  const newQty = currentQty + delta;
  const unitName = getProductBaseUnitName(product);

  const isAdd = delta >= 0;
  const bg = isAdd ? "var(--green-light)" : "var(--red-light)";
  const color = isAdd ? "var(--green)" : "var(--red)";
  const sign = isAdd ? "+" : "−";

  preview.style.display = "block";
  preview.style.background = bg;
  preview.style.color = color;
  preview.style.borderRadius = "var(--radius)";
  preview.style.padding = "9px 12px";
  preview.innerHTML = `${sign}${formatQty(qty)} ${unitName} &nbsp;→&nbsp; New stock: <strong>${formatQty(Math.max(0, newQty))} ${unitName}</strong>${newQty < 0 ? " ⚠️ Below zero" : ""}`;
}

function saveLogStockChange() {
  const productId = parseInt(document.getElementById("sl-log-product").value);
  const reasonId = parseInt(document.getElementById("sl-log-reason").value);
  const qty = parseFloat(document.getElementById("sl-log-qty").value) || 0;
  const direction = document.getElementById("sl-log-direction").value;
  const expiry = document.getElementById("sl-log-expiry").value.trim() || null;
  const notes = document.getElementById("sl-log-notes").value.trim() || null;

  if (!productId) { toast("Select a product", "error"); return; }
  if (!reasonId) { toast("Select a reason", "error"); return; }
  if (qty <= 0) { toast("Enter a valid quantity", "error"); return; }
  if (reasonId === 1 && !expiry) {
    toast("Expiration date is required for Purchase restocks", "error"); return;
  }

  const quantityChanged = direction === "+" ? qty : -qty;

  recordStockMovement({
    product_id: productId,
    stock_log_reason_id: reasonId,
    quantity_changed: quantityChanged,
    reference_type: null,
    reference_id: null,
    notes,
    expiry_date: expiry,
  });

  persistDb();
  closeModal("modal-log-stock");
  renderStockLogsPage();
  updateLowStockAlerts();

  const product = db.products.find((p) => p.id === productId);
  const sign = direction === "+" ? "+" : "−";
  const unitName = product ? getProductBaseUnitName(product) : "";
  toast(`${sign}${formatQty(qty)} ${unitName} logged for ${product?.name || "product"}`, "success");
}