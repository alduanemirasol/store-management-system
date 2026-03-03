/**
 * saleshistory.js
 * Sales History page — full table with click-to-detail modal.
 *
 * Schema:
 *   db.sales[]         — sale header (sale_date, payment_type_id, customer_id)
 *   db.sale_items[]    — line items (_product_name, _emoji, _unit_label, quantity, unit_price, is_manual_priced)
 *   db.payment_types[] — { id, name }
 *   db.customers[]     — customer info
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sh_getSaleTotal(saleId) {
  return db.sale_items
    .filter((si) => si.sale_id === saleId)
    .reduce((sum, si) => sum + si.quantity * si.unit_price, 0);
}

function sh_getPaymentName(paymentTypeId) {
  const pt = db.payment_types.find((p) => p.id === paymentTypeId);
  return pt ? pt.name : "—";
}

function sh_getCustomerName(customerId) {
  if (!customerId) return null;
  const c = db.customers.find((x) => x.id === customerId && !x.is_deleted);
  if (!c) return null;
  return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
}

function sh_formatDateTime(isoString) {
  const d = new Date(isoString);
  return {
    date: d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    relative: sh_relativeTime(d),
  };
}

function sh_relativeTime(d) {
  const diffMin = Math.floor((new Date() - d) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return diffMin + "m ago";
  if (diffMin < 1440) return Math.floor(diffMin / 60) + "h ago";
  if (diffMin < 10080) return Math.floor(diffMin / 1440) + "d ago";
  return Math.floor(diffMin / 10080) + "w ago";
}

function sh_getDateRangeStart(filterVal) {
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sow = new Date(sod); sow.setDate(sod.getDate() - sod.getDay());
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  return { today: sod, week: sow, month: som }[filterVal] || null;
}

// ─── Render Page ──────────────────────────────────────────────────────────────

function renderSalesHistoryPage() {
  const searchQ = (document.getElementById("sh-search")?.value || "").toLowerCase();
  const dateFilter = document.getElementById("sh-filter-date")?.value || "all";
  const payFilter = document.getElementById("sh-filter-pay")?.value || "all";
  const since = sh_getDateRangeStart(dateFilter);

  let sales = [...db.sales];

  // Date filter
  if (since) sales = sales.filter((s) => new Date(s.sale_date) >= since);

  // Payment filter
  if (payFilter !== "all") {
    const pt = db.payment_types.find((p) => p.name.toLowerCase() === payFilter);
    if (pt) sales = sales.filter((s) => s.payment_type_id === pt.id);
  }

  // Search: matches customer name or product name in line items
  if (searchQ) {
    sales = sales.filter((s) => {
      const custName = sh_getCustomerName(s.customer_id) || "";
      if (custName.toLowerCase().includes(searchQ)) return true;
      const items = db.sale_items.filter((si) => si.sale_id === s.id);
      return items.some((si) => (si._product_name || "").toLowerCase().includes(searchQ));
    });
  }

  // Sort newest first
  sales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));

  // ── Stats ──
  const totalRevenue = sales.reduce((s, sale) => s + sh_getSaleTotal(sale.id), 0);
  const cashSales = sales.filter((s) => sh_getPaymentName(s.payment_type_id) === "Cash");
  const creditSales = sales.filter((s) => sh_getPaymentName(s.payment_type_id) === "Credit");
  const avgSale = sales.length ? totalRevenue / sales.length : 0;

  document.getElementById("sh-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Total Sales</div>
      <div class="stat-value">${sales.length}</div>
      <div class="stat-sub">${dateFilter === "all" ? "All time" : "Filtered"}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Revenue</div>
      <div class="stat-value">₱${formatPeso(totalRevenue, 0)}</div>
      <div class="stat-sub">Avg ₱${formatPeso(avgSale)} / sale</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Cash Sales</div>
      <div class="stat-value">${cashSales.length}</div>
      <div class="stat-sub">₱${formatPeso(cashSales.reduce((s, x) => s + sh_getSaleTotal(x.id), 0), 0)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Credit Sales</div>
      <div class="stat-value">${creditSales.length}</div>
      <div class="stat-sub">₱${formatPeso(creditSales.reduce((s, x) => s + sh_getSaleTotal(x.id), 0), 0)}</div>
    </div>`;

  // ── Table ──
  const tbody = document.getElementById("sh-tbody");

  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="page-empty">
      <div style="padding:32px 0;">
        <div style="font-size:36px;margin-bottom:10px;">🧾</div>
        <div style="font-weight:600;color:var(--text2);font-size:15px;">No sales found</div>
        <div style="font-size:13px;color:var(--text3);margin-top:4px;">Try adjusting your filters or date range</div>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map((sale) => {
    const saleItems = db.sale_items.filter((si) => si.sale_id === sale.id);
    const total = sh_getSaleTotal(sale.id);
    const dt = sh_formatDateTime(sale.sale_date);
    const payName = sh_getPaymentName(sale.payment_type_id);
    const custName = sh_getCustomerName(sale.customer_id);
    const isCredit = payName === "Credit";

    // Items preview: first 2 item names + overflow
    const itemNames = saleItems.map((si) => `${si._emoji || "📦"} ${si._product_name || "Item"}`);
    let itemsPreview = itemNames.slice(0, 2).join(", ");
    if (itemNames.length > 2) itemsPreview += ` <span class="sh-overflow-badge">+${itemNames.length - 2} more</span>`;

    const payBadge = isCredit
      ? `<span class="badge badge-orange">📒 Credit</span>`
      : `<span class="badge badge-green">💵 Cash</span>`;

    return `<tr class="sh-row" onclick="openSaleDetailModal(${sale.id})" title="Click to view details">
      <td>
        <div class="sh-datetime">
          <span class="sh-date">${dt.date}</span>
          <span class="sh-time">${dt.time}</span>
        </div>
        <div class="sh-relative">${dt.relative}</div>
      </td>
      <td>${payBadge}${custName ? `<div class="sh-customer-name">👤 ${custName}</div>` : ""}</td>
      <td>
        <div class="sh-items-preview">${itemsPreview}</div>
        <div class="sh-item-count">${saleItems.length} item${saleItems.length !== 1 ? "s" : ""}</div>
      </td>
      <td>
        <div class="sh-total">₱${formatPeso(total)}</div>
      </td>
      <td>
        <span class="sh-view-btn">View →</span>
      </td>
    </tr>`;
  }).join("");
}

// ─── Sale Detail Modal ────────────────────────────────────────────────────────

function openSaleDetailModal(saleId) {
  const sale = db.sales.find((s) => s.id === saleId);
  if (!sale) return;

  const saleItems = db.sale_items.filter((si) => si.sale_id === saleId);
  const total = sh_getSaleTotal(saleId);
  const dt = sh_formatDateTime(sale.sale_date);
  const payName = sh_getPaymentName(sale.payment_type_id);
  const custName = sh_getCustomerName(sale.customer_id);
  const isCredit = payName === "Credit";
  const saleNum = `#${String(sale.id).padStart(4, "0")}`;

  // ── Header ──
  document.getElementById("sh-modal-sale-num").textContent = `Sale ${saleNum}`;
  document.getElementById("sh-modal-datetime").textContent = `${dt.date} at ${dt.time}`;

  // ── Payment Info ──
  const payBadge = isCredit
    ? `<span class="badge badge-orange" style="font-size:13px;padding:5px 12px;">📒 Credit</span>`
    : `<span class="badge badge-green" style="font-size:13px;padding:5px 12px;">💵 Cash</span>`;

  document.getElementById("sh-modal-payment-info").innerHTML = `
    <div class="sh-detail-info-row">
      <span class="sh-detail-info-label">Payment Method</span>
      <span>${payBadge}</span>
    </div>
    ${custName ? `
    <div class="sh-detail-info-row">
      <span class="sh-detail-info-label">Customer</span>
      <span class="sh-detail-info-value">👤 ${custName}</span>
    </div>` : ""}
    <div class="sh-detail-info-row">
      <span class="sh-detail-info-label">Sale ID</span>
      <span class="sh-detail-info-value" style="font-family:monospace;font-size:13px;">${saleNum}</span>
    </div>
    <div class="sh-detail-info-row">
      <span class="sh-detail-info-label">Date & Time</span>
      <span class="sh-detail-info-value">${dt.date} · ${dt.time}</span>
    </div>`;

  // ── Item Breakdown ──
  const itemsHtml = saleItems.map((si, idx) => {
    const lineTotal = si.quantity * si.unit_price;
    const isManual = si.is_manual_priced;
    return `
    <div class="sh-detail-item ${idx === saleItems.length - 1 ? "last" : ""}">
      <div class="sh-detail-item-left">
        <span class="sh-detail-item-emoji">${si._emoji || "📦"}</span>
        <div class="sh-detail-item-info">
          <div class="sh-detail-item-name">
            ${si._product_name || "Item"}
            ${isManual ? `<span class="manual-badge" title="Manual price">✏️ manual</span>` : ""}
          </div>
          <div class="sh-detail-item-meta">
            ${si.quantity} ${si._unit_label || "unit"} × ₱${formatPeso(si.unit_price)}
          </div>
        </div>
      </div>
      <div class="sh-detail-item-total">₱${formatPeso(lineTotal)}</div>
    </div>`;
  }).join("");

  document.getElementById("sh-modal-items").innerHTML = itemsHtml || `<div style="color:var(--text3);padding:16px;text-align:center;">No items found.</div>`;

  // ── Summary ──
  document.getElementById("sh-modal-item-count").textContent = `${saleItems.length} item${saleItems.length !== 1 ? "s" : ""}`;
  document.getElementById("sh-modal-subtotal").textContent = `₱${formatPeso(total)}`;
  document.getElementById("sh-modal-total").textContent = `₱${formatPeso(total)}`;

  openModal("modal-sale-detail");
}