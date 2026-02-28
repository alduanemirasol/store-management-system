function formatDate(d) {
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function formatTime(d) {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
  return (
    { today: startOfDay, week: startOfWeek, month: startOfMonth }[filterVal] ||
    null
  );
}

function renderTransactions() {
  const total = db.transactions.reduce((s, t) => s + t.total, 0);
  const today = new Date().toDateString();
  const todayTxns = db.transactions.filter(
    (t) => new Date(t.date).toDateString() === today,
  );
  const todayTotal = todayTxns.reduce((s, t) => s + t.total, 0);

  document.getElementById("txn-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Total Transactions</div>
      <div class="stat-value">${db.transactions.length}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₱${formatPeso(total, 0)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Today's Sales</div>
      <div class="stat-value">${todayTxns.length}</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Today's Revenue</div>
      <div class="stat-value">₱${formatPeso(todayTotal, 0)}</div>
    </div>
  `;

  const tbody = document.getElementById("txn-tbody");
  if (!db.transactions.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="page-empty">No transactions yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = db.transactions
    .map((txn) => {
      const d = new Date(txn.date);
      return `<tr>
        <td><strong>#${String(txn.id).padStart(4, "0")}</strong></td>
        <td>
          <div>${formatDate(d)}</div>
          <div class="txn-meta">${formatTime(d)}</div>
        </td>
        <td>
          <span>${txn.items.length} item${txn.items.length !== 1 ? "s" : ""}</span>
          <span class="txn-items-detail"> — ${txn.items.map((i) => i.item_name).join(", ")}</span>
        </td>
        <td><strong>₱${formatPeso(txn.total)}</strong></td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewTxnDetail(${txn.id})">View</button></td>
      </tr>`;
    })
    .join("");
}

function viewTxnDetail(txnId) {
  const txn = db.transactions.find((t) => t.id === txnId);
  if (!txn) return;
  const d = new Date(txn.date);
  document.getElementById("txn-detail-body").innerHTML = `
    <div style="margin-bottom:14px;">
      <strong>Transaction #${String(txn.id).padStart(4, "0")}</strong><br>
      <span style="color:var(--text3);font-size:12px;">${d.toLocaleString()}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Item</th>
          <th>Detail</th>
          <th style="text-align:right;">Price</th>
        </tr></thead>
        <tbody>
          ${txn.items
      .map(
        (ci) => `<tr>
              <td>${ci.emoji || "📦"} ${ci.item_name}</td>
              <td class="txn-meta">${ci.detail}</td>
              <td style="text-align:right;font-weight:600;">₱${formatPeso(ci.price)}</td>
            </tr>`,
      )
      .join("")}
        </tbody>
      </table>
    </div>
    <div style="text-align:right;margin-top:14px;padding-top:10px;border-top:2px solid var(--border);">
      <strong style="font-size:18px;">Total: ₱${formatPeso(txn.total)}</strong>
    </div>
  `;
  openModal("modal-txn-detail");
}

function renderRecentSalesPage() {
  const searchQ = (
    document.getElementById("rs-search")?.value || ""
  ).toLowerCase();
  const dateFilter = document.getElementById("rs-filter-date")?.value || "all";
  const since = getDateRangeFilter(dateFilter);

  let rows = [];
  db.transactions.forEach((txn) => {
    const txnDate = new Date(txn.date);
    txn.items.forEach((ci) => rows.push({ ...ci, txnDate, txnId: txn.id }));
  });

  if (since) rows = rows.filter((r) => r.txnDate >= since);
  if (searchQ)
    rows = rows.filter((r) => r.item_name.toLowerCase().includes(searchQ));
  rows.sort((a, b) => b.txnDate - a.txnDate);

  const totalRevenue = rows.reduce((s, r) => s + r.price, 0);
  const uniqueItems = new Set(rows.map((r) => r.item_name)).size;
  const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);

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

  tbody.innerHTML = rows
    .map((r) => {
      const d = r.txnDate;
      return `<tr>
        <td>
          <strong>${r.emoji || "📦"} ${r.item_name}</strong>
          ${r.is_manual ? '<span class="manual-badge">✏ manual</span>' : ""}
        </td>
        <td>
          ${r.qty}
          <span style="color:var(--text3);font-size:12px;">${r.unit_label || ""}</span>
        </td>
        <td><strong style="color:var(--green);">₱${formatPeso(r.price)}</strong></td>
        <td>
          <div>${formatDate(d)}</div>
          <div style="font-size:11px;color:var(--text3);">${formatTime(d)} · ${relativeTimeFrom(d)}</div>
        </td>
        <td><span class="badge badge-blue">#${String(r.txnId).padStart(4, "0")}</span></td>
      </tr>`;
    })
    .join("");
}

function renderStockLogsPage() {
  const searchQ = (
    document.getElementById("sl-search")?.value || ""
  ).toLowerCase();
  const typeFilter = document.getElementById("sl-filter-type")?.value || "all";
  const dateFilter = document.getElementById("sl-filter-date")?.value || "all";
  const since = getDateRangeFilter(dateFilter);

  let logs = [...db.stock_logs];
  if (since) logs = logs.filter((l) => new Date(l.date) >= since);
  if (typeFilter !== "all")
    logs = logs.filter((l) => l.change_type === typeFilter);
  if (searchQ)
    logs = logs.filter((l) => l.item_name.toLowerCase().includes(searchQ));
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));

  const restockLogs = logs.filter((l) => l.change_type === "restock");
  const saleLogs = logs.filter((l) => l.change_type === "sale");
  const totalIn = restockLogs.reduce((s, l) => s + l.qty_change, 0);
  const totalOut = saleLogs.reduce((s, l) => s + Math.abs(l.qty_change), 0);
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

  tbody.innerHTML = logs
    .map((l) => {
      const d = new Date(l.date);
      const isSale = l.change_type === "sale";
      const typeBadge = isSale
        ? '<span class="badge badge-orange">📤 Sale</span>'
        : '<span class="badge badge-green">📦 Restock</span>';
      const qtyColor = isSale ? "var(--red)" : "var(--green)";
      const qtyValue = parseFloat(Math.abs(l.qty_change).toFixed(4)).toLocaleString();
      const qtyPrefix = isSale ? "−" : "+";
      const unitLabel = l.unit_label || "";

      return `<tr>
        <td><strong>${l.emoji} ${l.item_name}</strong></td>
        <td>${typeBadge}</td>
        <td>
          <span style="color:${qtyColor};font-weight:600;">${qtyPrefix}${qtyValue}</span>
          <span style="font-size:12px;color:var(--text3);margin-left:4px;">${unitLabel}</span>
        </td>
        <td>
          <div>${formatDate(d)}</div>
          <div style="font-size:11px;color:var(--text3);">${formatTime(d)} · ${relativeTimeFrom(d)}</div>
        </td>
        <td style="font-size:12px;color:var(--text2);">${l.note || "—"}</td>
      </tr>`;
    })
    .join("");
}