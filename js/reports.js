/**
 * reports.js
 * Stock Logs — rewritten for new schema.
 *
 * Schema mappings:
 *   Old: db.stock_logs[]          → New: db.stock_movements[] + db.stock_log_reasons[]
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
 */
function getSaleTotal(saleId) {
  return db.sale_items
    .filter((si) => si.sale_id === saleId)
    .reduce((sum, si) => sum + si.quantity * si.unit_price, 0);
}

// ─── Stock Logs page ──────────────────────────────────────────────────────────
// Uses db.stock_movements (immutable audit log) instead of old db.stock_logs

function renderStockLogsPage() {
  const searchQ = (document.getElementById("sl-search")?.value || "").toLowerCase();
  const typeFilter = document.getElementById("sl-filter-type")?.value || "all";
  const dateFilter = document.getElementById("sl-filter-date")?.value || "all";
  const since = getDateRangeFilter(dateFilter);

  // Map stock_log_reasons to a quick lookup
  const reasonMap = {};
  db.stock_log_reasons.forEach((r) => { reasonMap[r.id] = r.name; });

  let logs = [...db.stock_movements];

  if (since) logs = logs.filter((l) => new Date(l.created_at) >= since);

  // type filter: "sale" maps to reason "Sale", "restock" maps to "Purchase"
  if (typeFilter === "sale") {
    const saleReasonId = db.stock_log_reasons.find((r) => r.name === "Sale")?.id;
    logs = logs.filter((l) => l.stock_log_reason_id === saleReasonId);
  } else if (typeFilter === "restock") {
    const purchaseReasonId = db.stock_log_reasons.find((r) => r.name === "Purchase")?.id;
    logs = logs.filter((l) => l.stock_log_reason_id === purchaseReasonId);
  }

  if (searchQ) {
    logs = logs.filter((l) => {
      const product = db.products.find((p) => p.id === l.product_id);
      return product && product.name.toLowerCase().includes(searchQ);
    });
  }

  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const saleReasonId = db.stock_log_reasons.find((r) => r.name === "Sale")?.id;
  const purchaseReasonId = db.stock_log_reasons.find((r) => r.name === "Purchase")?.id;

  const restockLogs = logs.filter((l) => l.stock_log_reason_id === purchaseReasonId);
  const saleLogs = logs.filter((l) => l.stock_log_reason_id === saleReasonId);
  const totalIn = restockLogs.reduce((s, l) => s + l.quantity_changed, 0);
  const totalOut = saleLogs.reduce((s, l) => s + Math.abs(l.quantity_changed), 0);
  const netChange = totalIn - totalOut;

  document.getElementById("sl-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Total Log Entries</div>
      <div class="stat-value">${logs.length}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Restock Events</div>
      <div class="stat-value">${restockLogs.length}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Sale Events</div>
      <div class="stat-value">${saleLogs.length}</div>
    </div>
    <div class="stat-card ${netChange >= 0 ? "green" : "red"}">
      <div class="stat-label">Net Units Change</div>
      <div class="stat-value">${netChange >= 0 ? "+" : ""}${parseFloat(netChange.toFixed(2)).toLocaleString()}</div>
    </div>
  `;

  const tbody = document.getElementById("sl-tbody");
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="page-empty">No stock logs found.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map((l) => {
    const d = new Date(l.created_at);
    const product = db.products.find((p) => p.id === l.product_id);
    const productName = product ? product.name : `Product #${l.product_id}`;
    const productEmoji = product ? (product.emoji || "📦") : "📦";
    const reasonName = reasonMap[l.stock_log_reason_id] || "Unknown";
    const isSale = l.stock_log_reason_id === saleReasonId;

    const typeBadge = isSale
      ? '<span class="badge badge-orange">📤 Sale</span>'
      : reasonName === "Purchase"
        ? '<span class="badge badge-green">📦 Restock</span>'
        : `<span class="badge badge-blue">${reasonName}</span>`;

    const isPositive = l.quantity_changed >= 0;
    const qtyColor = isPositive ? "var(--green)" : "var(--red)";
    const qtySign = isPositive ? "+" : "−";
    const baseUnitName = product ? getProductBaseUnitName(product) : "";

    return `<tr>
      <td><strong>${productEmoji} ${productName}</strong></td>
      <td>${typeBadge}</td>
      <td>
        <span style="color:${qtyColor};font-weight:600;">${qtySign}${formatQty(Math.abs(l.quantity_changed))}</span>
        <span style="font-size:12px;color:var(--text3);margin-left:4px;">${baseUnitName}</span>
      </td>
      <td>
        <div>${formatDate(d)}</div>
        <div style="font-size:11px;color:var(--text3);">${formatTime(d)} · ${relativeTimeFrom(d)}</div>
      </td>
      <td style="font-size:12px;color:var(--text2);">${l.notes || "—"}</td>
    </tr>`;
  }).join("");
}