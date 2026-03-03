/**
 * utang.js
 * Utang (Credit/Debt) page — card layout with inline Bayad (payment) functionality.
 *
 * Schema:
 *   db.credit[]          — credit rows (amount_owed, amount_paid, due_date, status, customer_id, sale_id)
 *   db.credit_payments[] — payment audit trail
 *   db.customers[]       — customer info
 */

let bayad_creditId = null; // credit.id being paid

// ─── Render ───────────────────────────────────────────────────────────────────

function renderUtangPage() {
  const filterStatus = document.getElementById("utang-filter-status")?.value || "unpaid";
  const searchQ = (document.getElementById("utang-search")?.value || "").toLowerCase();

  // Build joined rows
  let rows = db.credit.map((cr) => {
    const customer = db.customers.find((c) => c.id === cr.customer_id && !c.is_deleted);
    return { cr, customer };
  }).filter(({ customer }) => !!customer);

  // Status filter
  if (filterStatus === "unpaid") {
    rows = rows.filter(({ cr }) => cr.status !== "PAID");
  } else if (filterStatus === "paid") {
    rows = rows.filter(({ cr }) => cr.status === "PAID");
  }

  // Search filter
  if (searchQ) {
    rows = rows.filter(({ customer }) => {
      const name = getCustomerFullName(customer).toLowerCase();
      return name.includes(searchQ);
    });
  }

  // Sort: overdue first, then by due_date ascending, paid last
  rows.sort((a, b) => {
    const today = new Date().toISOString().split("T")[0];
    const aOverdue = a.cr.status !== "PAID" && a.cr.due_date < today;
    const bOverdue = b.cr.status !== "PAID" && b.cr.due_date < today;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return (a.cr.due_date || "").localeCompare(b.cr.due_date || "");
  });

  // Stats
  const allUnpaid = db.credit.filter((cr) => cr.status !== "PAID");
  const totalOwed = allUnpaid.reduce((s, cr) => s + (cr.amount_owed - cr.amount_paid), 0);
  const today = new Date().toISOString().split("T")[0];
  const overdue = allUnpaid.filter((cr) => cr.due_date && cr.due_date < today);
  const overdueAmt = overdue.reduce((s, cr) => s + (cr.amount_owed - cr.amount_paid), 0);
  const paidCount = db.credit.filter((cr) => cr.status === "PAID").length;

  document.getElementById("utang-stats").innerHTML = `
    <div class="stat-card red">
      <div class="stat-label">Total Utang</div>
      <div class="stat-value">₱${formatPeso(totalOwed, 0)}</div>
      <div class="stat-sub">${allUnpaid.length} unpaid record${allUnpaid.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Overdue</div>
      <div class="stat-value">₱${formatPeso(overdueAmt, 0)}</div>
      <div class="stat-sub">${overdue.length} record${overdue.length !== 1 ? "s" : ""} past due date</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Fully Paid</div>
      <div class="stat-value">${paidCount}</div>
      <div class="stat-sub">record${paidCount !== 1 ? "s" : ""} settled</div>
    </div>
  `;

  const grid = document.getElementById("utang-grid");

  if (!rows.length) {
    grid.innerHTML = `
      <div class="utang-empty">
        <div class="utang-empty-icon">${filterStatus === "paid" ? "✅" : "🎉"}</div>
        <div class="utang-empty-title">${filterStatus === "paid" ? "No paid records found" : "No utang records"}</div>
        <div class="utang-empty-sub">${filterStatus === "paid" ? "No payments recorded yet." : "All customers are settled up!"}</div>
      </div>`;
    return;
  }

  grid.innerHTML = rows.map(({ cr, customer }) => buildUtangCard(cr, customer)).join("");
}

function buildUtangCard(cr, customer) {
  const today = new Date().toISOString().split("T")[0];
  const remaining = cr.amount_owed - cr.amount_paid;
  const isPaid = cr.status === "PAID" || remaining <= 0;
  const isOverdue = !isPaid && cr.due_date && cr.due_date < today;
  const pct = cr.amount_owed > 0 ? Math.min(100, Math.round((cr.amount_paid / cr.amount_owed) * 100)) : 0;

  // Status badge
  let statusBadge, cardClass;
  if (isPaid) {
    statusBadge = `<span class="utang-status-badge paid">✅ Paid</span>`;
    cardClass = "utang-card paid";
  } else if (isOverdue) {
    statusBadge = `<span class="utang-status-badge overdue">🔴 Overdue</span>`;
    cardClass = "utang-card overdue";
  } else {
    statusBadge = `<span class="utang-status-badge pending">🕐 Pending</span>`;
    cardClass = "utang-card";
  }

  // Due date display
  const dueDateStr = cr.due_date
    ? new Date(cr.due_date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  // Sale reference
  const saleRef = cr.sale_id ? `#${String(cr.sale_id).padStart(4, "0")}` : "—";

  // Progress bar color
  const barColor = isPaid ? "var(--green)" : isOverdue ? "var(--red)" : "var(--accent)";

  return `
  <div class="${cardClass}" id="utang-card-${cr.id}">
    <div class="utang-card-header">
      <div class="utang-card-customer">
        <div class="utang-avatar">${getInitials(customer)}</div>
        <div>
          <div class="utang-customer-name">${getCustomerFullName(customer)}</div>
          <div class="utang-sale-ref">Sale ${saleRef}</div>
        </div>
      </div>
      ${statusBadge}
    </div>

    <div class="utang-card-body">
      <div class="utang-amount-row">
        <div class="utang-amount-item">
          <span class="utang-amount-label">Amount Owed</span>
          <span class="utang-amount-value owed">₱${formatPeso(cr.amount_owed)}</span>
        </div>
        <div class="utang-amount-item">
          <span class="utang-amount-label">Amount Paid</span>
          <span class="utang-amount-value paid-val" id="paid-val-${cr.id}">₱${formatPeso(cr.amount_paid)}</span>
        </div>
        <div class="utang-amount-item highlight">
          <span class="utang-amount-label">Remaining</span>
          <span class="utang-amount-value remaining ${isPaid ? "is-paid" : isOverdue ? "is-overdue" : ""}" id="remaining-val-${cr.id}">
            ${isPaid ? "₱0.00" : "₱" + formatPeso(remaining)}
          </span>
        </div>
      </div>

      <div class="utang-progress-wrap">
        <div class="utang-progress-bar">
          <div class="utang-progress-fill" id="progress-fill-${cr.id}"
               style="width:${pct}%;background:${barColor};"></div>
        </div>
        <span class="utang-progress-label" id="progress-label-${cr.id}">${pct}% paid</span>
      </div>

      <div class="utang-meta-row">
        <div class="utang-meta-item">
          <span class="utang-meta-icon">📅</span>
          <span class="utang-meta-label">Due Date:</span>
          <span class="utang-meta-val ${isOverdue ? "overdue-text" : ""}">${dueDateStr}</span>
        </div>
        ${customer.contact_number ? `
        <div class="utang-meta-item">
          <span class="utang-meta-icon">📞</span>
          <span class="utang-meta-label">Contact:</span>
          <span class="utang-meta-val">${customer.contact_number}</span>
        </div>` : ""}
      </div>
    </div>

    <div class="utang-card-footer">
      ${!isPaid
      ? `<button class="btn btn-success utang-bayad-btn" onclick="openBayadModal(${cr.id})">
             💰 Bayad
           </button>`
      : `<div class="utang-paid-stamp">PAID ✓</div>`
    }
    </div>
  </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(customer) {
  const f = (customer.first_name || "?")[0].toUpperCase();
  const l = (customer.last_name || "")[0]?.toUpperCase() || "";
  return f + l;
}

// ─── Bayad Modal ──────────────────────────────────────────────────────────────

function openBayadModal(creditId) {
  const cr = db.credit.find((c) => c.id === creditId);
  if (!cr) return;
  const customer = db.customers.find((c) => c.id === cr.customer_id);
  if (!customer) return;

  bayad_creditId = creditId;
  const remaining = cr.amount_owed - cr.amount_paid;

  document.getElementById("bayad-customer-name").textContent = getCustomerFullName(customer);
  document.getElementById("bayad-amount-owed").textContent = "₱" + formatPeso(cr.amount_owed);
  document.getElementById("bayad-amount-paid").textContent = "₱" + formatPeso(cr.amount_paid);
  document.getElementById("bayad-remaining").textContent = "₱" + formatPeso(remaining);
  document.getElementById("bayad-amount-input").value = "";
  document.getElementById("bayad-amount-input").max = remaining;
  document.getElementById("bayad-full-btn").setAttribute("data-remaining", remaining);
  document.getElementById("bayad-error").style.display = "none";
  document.getElementById("bayad-preview").style.display = "none";

  openModal("modal-bayad");
  setTimeout(() => document.getElementById("bayad-amount-input").focus(), 100);
}

function bayad_fillFull() {
  const remaining = parseFloat(document.getElementById("bayad-full-btn").getAttribute("data-remaining")) || 0;
  document.getElementById("bayad-amount-input").value = remaining.toFixed(2);
  onBayadAmountInput();
}

function onBayadAmountInput() {
  const cr = db.credit.find((c) => c.id === bayad_creditId);
  if (!cr) return;

  const remaining = cr.amount_owed - cr.amount_paid;
  const input = parseFloat(document.getElementById("bayad-amount-input").value) || 0;
  const errorEl = document.getElementById("bayad-error");
  const previewEl = document.getElementById("bayad-preview");
  const confirmBtn = document.getElementById("bayad-confirm-btn");

  // Validation
  if (input <= 0) {
    errorEl.style.display = "none";
    previewEl.style.display = "none";
    confirmBtn.disabled = true;
    return;
  }

  if (input > remaining + 0.001) {
    errorEl.textContent = `⚠️ Amount exceeds remaining balance of ₱${formatPeso(remaining)}`;
    errorEl.style.display = "block";
    previewEl.style.display = "none";
    confirmBtn.disabled = true;
    return;
  }

  errorEl.style.display = "none";
  confirmBtn.disabled = false;

  const newPaid = cr.amount_paid + input;
  const newRemaining = Math.max(0, remaining - input);
  const willBePaid = newRemaining < 0.005;

  previewEl.style.display = "flex";
  document.getElementById("bayad-preview-paid").textContent = "₱" + formatPeso(newPaid);
  document.getElementById("bayad-preview-remaining").textContent = willBePaid ? "₱0.00" : "₱" + formatPeso(newRemaining);
  document.getElementById("bayad-preview-status").textContent = willBePaid ? "✅ Will be marked as PAID" : "🕐 Still pending";
  document.getElementById("bayad-preview-status").className = "bayad-preview-status " + (willBePaid ? "is-paid" : "is-pending");
}

function confirmBayad() {
  const cr = db.credit.find((c) => c.id === bayad_creditId);
  if (!cr) return;

  const amount = parseFloat(document.getElementById("bayad-amount-input").value) || 0;
  const remaining = cr.amount_owed - cr.amount_paid;

  if (amount <= 0 || amount > remaining + 0.001) {
    toast("Invalid payment amount", "error");
    return;
  }

  const now = new Date().toISOString();
  const userId = currentUser ? currentUser.id : null;
  const actualAmount = Math.min(amount, remaining);

  // Update credit row
  cr.amount_paid = parseFloat((cr.amount_paid + actualAmount).toFixed(4));
  cr.updated_at = now;

  const newRemaining = cr.amount_owed - cr.amount_paid;
  if (newRemaining < 0.005) {
    cr.amount_paid = cr.amount_owed;
    cr.status = "PAID";
  }

  // Audit record in credit_payments
  db.credit_payments.push({
    id: newId("credit_payments"),
    credit_id: cr.id,
    customer_id: cr.customer_id,
    amount_paid: actualAmount,
    payment_date: now,
    created_by: userId,
    created_at: now,
  });

  persistDb();
  closeModal("modal-bayad");

  // Live-update the card without full re-render
  updateUtangCardInPlace(cr);

  const customer = db.customers.find((c) => c.id === cr.customer_id);
  const custName = customer ? getCustomerFullName(customer) : "Customer";
  if (cr.status === "PAID") {
    toast(`✅ ${custName}'s utang fully paid!`, "success");
  } else {
    toast(`💰 Payment of ₱${formatPeso(actualAmount)} recorded for ${custName}`, "success");
  }

  // Refresh stats
  renderUtangStats();
}

/** Patches a single card's DOM values without re-rendering the whole grid. */
function updateUtangCardInPlace(cr) {
  const card = document.getElementById(`utang-card-${cr.id}`);
  if (!card) return;

  const remaining = Math.max(0, cr.amount_owed - cr.amount_paid);
  const isPaid = cr.status === "PAID";
  const pct = cr.amount_owed > 0 ? Math.min(100, Math.round((cr.amount_paid / cr.amount_owed) * 100)) : 0;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = !isPaid && cr.due_date && cr.due_date < today;
  const barColor = isPaid ? "var(--green)" : isOverdue ? "var(--red)" : "var(--accent)";

  // Update values
  const paidValEl = document.getElementById(`paid-val-${cr.id}`);
  const remainingValEl = document.getElementById(`remaining-val-${cr.id}`);
  const progressFill = document.getElementById(`progress-fill-${cr.id}`);
  const progressLabel = document.getElementById(`progress-label-${cr.id}`);

  if (paidValEl) paidValEl.textContent = "₱" + formatPeso(cr.amount_paid);
  if (remainingValEl) {
    remainingValEl.textContent = isPaid ? "₱0.00" : "₱" + formatPeso(remaining);
    remainingValEl.className = `utang-amount-value remaining ${isPaid ? "is-paid" : isOverdue ? "is-overdue" : ""}`;
  }
  if (progressFill) {
    progressFill.style.width = pct + "%";
    progressFill.style.background = barColor;
  }
  if (progressLabel) progressLabel.textContent = pct + "% paid";

  if (isPaid) {
    // Update card class, status badge, and footer
    card.className = "utang-card paid";
    const headerBadge = card.querySelector(".utang-status-badge");
    if (headerBadge) {
      headerBadge.className = "utang-status-badge paid";
      headerBadge.textContent = "✅ Paid";
    }
    const footer = card.querySelector(".utang-card-footer");
    if (footer) {
      footer.innerHTML = `<div class="utang-paid-stamp">PAID ✓</div>`;
    }
  }
}

function renderUtangStats() {
  const today = new Date().toISOString().split("T")[0];
  const allUnpaid = db.credit.filter((cr) => cr.status !== "PAID");
  const totalOwed = allUnpaid.reduce((s, cr) => s + (cr.amount_owed - cr.amount_paid), 0);
  const overdue = allUnpaid.filter((cr) => cr.due_date && cr.due_date < today);
  const overdueAmt = overdue.reduce((s, cr) => s + (cr.amount_owed - cr.amount_paid), 0);
  const paidCount = db.credit.filter((cr) => cr.status === "PAID").length;

  document.getElementById("utang-stats").innerHTML = `
    <div class="stat-card red">
      <div class="stat-label">Total Utang</div>
      <div class="stat-value">₱${formatPeso(totalOwed, 0)}</div>
      <div class="stat-sub">${allUnpaid.length} unpaid record${allUnpaid.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Overdue</div>
      <div class="stat-value">₱${formatPeso(overdueAmt, 0)}</div>
      <div class="stat-sub">${overdue.length} record${overdue.length !== 1 ? "s" : ""} past due date</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Fully Paid</div>
      <div class="stat-value">${paidCount}</div>
      <div class="stat-sub">record${paidCount !== 1 ? "s" : ""} settled</div>
    </div>
  `;
}