// ===================== TRANSACTIONS =====================
function renderTransactions() {
  const stats = document.getElementById("txn-stats");
  const total = db.transactions.reduce((s, t) => s + t.total, 0);
  const today = new Date().toDateString();
  const todayTxns = db.transactions.filter(
    (t) => new Date(t.date).toDateString() === today,
  );
  const todayTotal = todayTxns.reduce((s, t) => s + t.total, 0);

  stats.innerHTML = `
    <div class="stat-card blue"><div class="stat-label">Total Transactions</div><div class="stat-value">${db.transactions.length}</div></div>
    <div class="stat-card green"><div class="stat-label">Total Revenue</div><div class="stat-value">₱${total.toFixed(0)}</div></div>
    <div class="stat-card orange"><div class="stat-label">Today's Sales</div><div class="stat-value">${todayTxns.length}</div></div>
    <div class="stat-card blue"><div class="stat-label">Today's Revenue</div><div class="stat-value">₱${todayTotal.toFixed(0)}</div></div>
  `;

  const tbody = document.getElementById("txn-tbody");
  if (!db.transactions.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px;">No transactions yet.</td></tr>';
    return;
  }
  tbody.innerHTML = db.transactions
    .map(
      (txn) => `
    <tr>
      <td><strong>#${String(txn.id).padStart(4, "0")}</strong></td>
      <td><div class="txn-meta">${new Date(txn.date).toLocaleDateString()}</div>${new Date(txn.date).toLocaleTimeString()}</td>
      <td>${txn.items.length} item${txn.items.length !== 1 ? "s" : ""} — <span class="txn-items-detail">${txn.items.map((i) => i.item_name).join(", ")}</span></td>
      <td><strong>₱${txn.total.toFixed(2)}</strong></td>
      <td><button class="btn btn-secondary btn-sm" onclick="viewTxnDetail(${txn.id})">View</button></td>
    </tr>
  `,
    )
    .join("");
}

function viewTxnDetail(txnId) {
  const txn = db.transactions.find((t) => t.id === txnId);
  if (!txn) return;
  document.getElementById("txn-detail-body").innerHTML = `
    <div style="margin-bottom:14px;">
      <strong>Transaction #${String(txn.id).padStart(4, "0")}</strong><br>
      <span style="color:var(--text3);font-size:12px;">${new Date(txn.date).toLocaleString()}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="text-align:left;padding:8px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text3);">Item</th>
        <th style="text-align:left;padding:8px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text3);">Detail</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text3);">Price</th>
      </tr></thead>
      <tbody>
        ${txn.items
          .map(
            (ci) => `<tr>
          <td style="padding:8px;">${ci.emoji || "📦"} ${ci.item_name}</td>
          <td style="padding:8px;font-size:12px;color:var(--text3);">${ci.detail}</td>
          <td style="padding:8px;text-align:right;font-weight:600;">₱${ci.price.toFixed(2)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <div style="text-align:right;margin-top:14px;padding-top:10px;border-top:2px solid var(--border);">
      <strong style="font-size:18px;">Total: ₱${txn.total.toFixed(2)}</strong>
    </div>
  `;
  openModal("modal-txn-detail");
}

// ===================== RECENT SALES PAGE =====================
function renderRecentSalesPage() {
  const searchQ = (
    document.getElementById("rs-search")?.value || ""
  ).toLowerCase();
  const dateFilter = document.getElementById("rs-filter-date")?.value || "all";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let rows = [];
  db.transactions.forEach((txn) => {
    const txnDate = new Date(txn.date);
    txn.items.forEach((ci) => {
      rows.push({ ...ci, txnDate, txnId: txn.id });
    });
  });

  if (dateFilter === "today")
    rows = rows.filter((r) => r.txnDate >= startOfDay);
  else if (dateFilter === "week")
    rows = rows.filter((r) => r.txnDate >= startOfWeek);
  else if (dateFilter === "month")
    rows = rows.filter((r) => r.txnDate >= startOfMonth);

  if (searchQ)
    rows = rows.filter((r) => r.item_name.toLowerCase().includes(searchQ));
  rows.sort((a, b) => b.txnDate - a.txnDate);

  const totalItems = rows.length;
  const totalRevenue = rows.reduce((s, r) => s + r.price, 0);
  const uniqueItems = new Set(rows.map((r) => r.item_name)).size;
  const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);

  document.getElementById("rs-stats").innerHTML = `
        <div class="stat-card blue"><div class="stat-label">Line Items Sold</div><div class="stat-value">${totalItems}</div></div>
        <div class="stat-card green"><div class="stat-label">Total Revenue</div><div class="stat-value">₱${totalRevenue.toFixed(0)}</div></div>
        <div class="stat-card orange"><div class="stat-label">Unique Items</div><div class="stat-value">${uniqueItems}</div></div>
        <div class="stat-card blue"><div class="stat-label">Total Units Sold</div><div class="stat-value">${totalQty % 1 === 0 ? totalQty : totalQty.toFixed(2)}</div></div>
    `;

  const tbody = document.getElementById("rs-tbody");
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px;">No sales found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((r) => {
      const d = r.txnDate;
      const dateStr = d.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const timeStr = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const now2 = new Date();
      const diffMin = Math.floor((now2 - d) / 60000);
      const relTime =
        diffMin < 1
          ? "Just now"
          : diffMin < 60
            ? diffMin + "m ago"
            : diffMin < 1440
              ? Math.floor(diffMin / 60) + "h ago"
              : Math.floor(diffMin / 1440) + "d ago";

      return `<tr>
            <td>
                <strong>${r.emoji || "📦"} ${r.item_name}</strong>
                ${r.is_manual ? '<span class="manual-badge">✏ manual</span>' : ""}
            </td>
            <td>${r.qty} <span style="color:var(--text3);font-size:12px;">${r.unit_label || ""}</span></td>
            <td><strong style="color:var(--green);">₱${r.price.toFixed(2)}</strong></td>
            <td>
                <div style="font-size:13px;">${dateStr}</div>
                <div style="font-size:11px;color:var(--text3);">${timeStr} &nbsp;·&nbsp; ${relTime}</div>
            </td>
            <td>
                <span class="badge badge-blue">#${String(r.txnId).padStart(4, "0")}</span>
            </td>
        </tr>`;
    })
    .join("");
}

// ===================== STOCK LOGS PAGE =====================
function renderStockLogsPage() {
  const searchQ = (
    document.getElementById("sl-search")?.value || ""
  ).toLowerCase();
  const typeFilter = document.getElementById("sl-filter-type")?.value || "all";
  const dateFilter = document.getElementById("sl-filter-date")?.value || "all";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let logs = [...db.stock_logs];

  if (dateFilter === "today")
    logs = logs.filter((l) => new Date(l.date) >= startOfDay);
  else if (dateFilter === "week")
    logs = logs.filter((l) => new Date(l.date) >= startOfWeek);
  else if (dateFilter === "month")
    logs = logs.filter((l) => new Date(l.date) >= startOfMonth);

  if (typeFilter !== "all")
    logs = logs.filter((l) => l.change_type === typeFilter);
  if (searchQ)
    logs = logs.filter((l) => l.item_name.toLowerCase().includes(searchQ));
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalLogs = logs.length;
  const restockLogs = logs.filter((l) => l.change_type === "restock");
  const saleLogs = logs.filter((l) => l.change_type === "sale");
  const totalIn = restockLogs.reduce((s, l) => s + l.qty_change, 0);
  const totalOut = saleLogs.reduce((s, l) => s + Math.abs(l.qty_change), 0);

  document.getElementById("sl-stats").innerHTML = `
        <div class="stat-card blue"><div class="stat-label">Total Log Entries</div><div class="stat-value">${totalLogs}</div></div>
        <div class="stat-card green"><div class="stat-label">Restock Events</div><div class="stat-value">${restockLogs.length}</div></div>
        <div class="stat-card orange"><div class="stat-label">Sale Events</div><div class="stat-value">${saleLogs.length}</div></div>
        <div class="stat-card blue"><div class="stat-label">Net Units Change</div><div class="stat-value" style="font-size:18px;">${totalIn - totalOut >= 0 ? "+" : ""}${parseFloat((totalIn - totalOut).toFixed(2)).toLocaleString()}</div></div>
    `;

  const tbody = document.getElementById("sl-tbody");
  if (!logs.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px;">No stock logs found.</td></tr>';
    return;
  }

  tbody.innerHTML = logs
    .map((l) => {
      const d = new Date(l.date);
      const dateStr = d.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const timeStr = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const diffMin = Math.floor((new Date() - d) / 60000);
      const relTime =
        diffMin < 1
          ? "Just now"
          : diffMin < 60
            ? diffMin + "m ago"
            : diffMin < 1440
              ? Math.floor(diffMin / 60) + "h ago"
              : Math.floor(diffMin / 1440) + "d ago";

      const isSale = l.change_type === "sale";
      const typeBadge = isSale
        ? '<span class="badge badge-orange">📤 Sale</span>'
        : '<span class="badge badge-green">📦 Restock</span>';

      const qtyColor = isSale ? "var(--red)" : "var(--green)";
      const qtyStr = `${isSale ? "-" : "+"}${parseFloat(Math.abs(l.qty_change).toFixed(4)).toLocaleString()}`;

      return `<tr>
            <td><strong>${l.emoji} ${l.item_name}</strong></td>
            <td>${typeBadge}</td>
            <td><strong style="color:${qtyColor};font-size:14px;">${qtyStr}</strong>
                <span style="font-size:11px;color:var(--text3);margin-left:3px;">${l.unit_label}</span>
            </td>
            <td>
                <div style="font-size:13px;">${dateStr}</div>
                <div style="font-size:11px;color:var(--text3);">${timeStr} &nbsp;·&nbsp; ${relTime}</div>
            </td>
            <td style="font-size:12px;color:var(--text2);">${l.note || "—"}</td>
        </tr>`;
    })
    .join("");
}
