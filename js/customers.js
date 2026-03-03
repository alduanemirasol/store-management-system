/**
 * customers.js
 * Customer management page — CRUD with credit/utang tracking.
 *
 * Schema mappings:
 *   db.customers[]          — customer records
 *   db.customer_addresses[] — primary address per customer
 *   db.credit[]             — outstanding credit/utang rows
 */

let editingCustomerId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return total outstanding utang (unpaid balance) for a customer. */
function getCustomerUtang(customerId) {
    return db.credit
        .filter((cr) => cr.customer_id === customerId && cr.status !== "PAID")
        .reduce((sum, cr) => sum + ((cr.amount_owed || 0) - (cr.amount_paid || 0)), 0);
}

/** Return the primary address string for a customer. */
function getCustomerAddress(customerId) {
    const addr = db.customer_addresses.find(
        (a) => a.customer_id === customerId && a.is_primary,
    );
    if (!addr) return "—";
    const parts = [addr.street, addr.barangay, addr.municipality].filter(Boolean);
    return parts.join(", ") || "—";
}

/** Full display name. */
function getCustomerFullName(customer) {
    return [customer.first_name, customer.middle_name, customer.last_name]
        .filter(Boolean)
        .join(" ");
}

// ─── Page render ──────────────────────────────────────────────────────────────

function renderCustomersPage() {
    const searchQ = (document.getElementById("cust-search")?.value || "").toLowerCase();

    let customers = db.customers.filter((c) => !c.is_deleted);

    if (searchQ) {
        customers = customers.filter((c) => {
            const name = getCustomerFullName(c).toLowerCase();
            const contact = (c.contact_number || "").toLowerCase();
            const addr = getCustomerAddress(c.id).toLowerCase();
            return name.includes(searchQ) || contact.includes(searchQ) || addr.includes(searchQ);
        });
    }

    // Stats
    const totalCustomers = db.customers.filter((c) => !c.is_deleted).length;
    const totalUtang = db.customers
        .filter((c) => !c.is_deleted)
        .reduce((s, c) => s + getCustomerUtang(c.id), 0);
    const withBalance = db.customers.filter(
        (c) => !c.is_deleted && getCustomerUtang(c.id) > 0,
    ).length;

    document.getElementById("cust-stats").innerHTML = `
    <div class="stat-card blue">
      <div class="stat-label">Total Customers</div>
      <div class="stat-value">${totalCustomers}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">With Utang</div>
      <div class="stat-value">${withBalance}</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Total Utang</div>
      <div class="stat-value">₱${formatPeso(totalUtang, 0)}</div>
    </div>
  `;

    const tbody = document.getElementById("cust-tbody");

    if (!customers.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="page-empty">
      ${searchQ ? "No customers match your search." : "No customers yet. Click \"+ Add Customer\" to get started."}
    </td></tr>`;
        return;
    }

    tbody.innerHTML = customers
        .map((c) => {
            const utang = getCustomerUtang(c.id);
            const address = getCustomerAddress(c.id);
            const utangColor = utang > 0 ? "var(--red)" : "var(--green)";
            const utangBadge =
                utang > 0
                    ? `<span class="badge badge-red">₱${formatPeso(utang)}</span>`
                    : `<span class="badge badge-green">₱0.00</span>`;

            const creditPct =
                c.credit_limit > 0
                    ? Math.min(100, Math.round((utang / c.credit_limit) * 100))
                    : 0;
            const barColor =
                creditPct >= 90 ? "var(--red)" : creditPct >= 60 ? "var(--orange)" : "var(--green)";

            return `<tr>
        <td>
          <div style="font-weight:600;">${getCustomerFullName(c)}</div>
        </td>
        <td style="color:var(--text2);">${c.contact_number || "—"}</td>
        <td style="color:var(--text2);font-size:13px;">${address}</td>
        <td>
          <span style="font-weight:600;">₱${formatPeso(c.credit_limit)}</span>
          <div style="margin-top:5px;background:rgba(0,0,0,0.08);border-radius:4px;height:5px;width:90px;overflow:hidden;">
            <div style="width:${creditPct}%;background:${barColor};height:100%;border-radius:4px;transition:width 0.3s;"></div>
          </div>
        </td>
        <td>${utangBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="openEditCustomerModal(${c.id})">✏️ Edit</button>
            <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);"
              onclick="deleteCustomer(${c.id})"
              ${utang > 0 ? 'disabled title="Cannot delete: customer has outstanding utang"' : ""}>🗑️ Delete</button>
          </div>
        </td>
      </tr>`;
        })
        .join("");
}

// ─── Modal: Add / Edit ────────────────────────────────────────────────────────

function openAddCustomerModal() {
    editingCustomerId = null;
    document.getElementById("cust-modal-title").textContent = "Add New Customer";
    document.getElementById("cust-first-name").value = "";
    document.getElementById("cust-middle-name").value = "";
    document.getElementById("cust-last-name").value = "";
    document.getElementById("cust-contact").value = "";
    document.getElementById("cust-credit-limit").value = "";
    document.getElementById("cust-street").value = "";
    document.getElementById("cust-barangay").value = "";
    document.getElementById("cust-municipality").value = "";
    openModal("modal-customer");
}

function openEditCustomerModal(customerId) {
    editingCustomerId = customerId;
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) return;

    document.getElementById("cust-modal-title").textContent = "Edit Customer";
    document.getElementById("cust-first-name").value = c.first_name || "";
    document.getElementById("cust-middle-name").value = c.middle_name || "";
    document.getElementById("cust-last-name").value = c.last_name || "";
    document.getElementById("cust-contact").value = c.contact_number || "";
    document.getElementById("cust-credit-limit").value = c.credit_limit ?? "";

    const addr = db.customer_addresses.find(
        (a) => a.customer_id === customerId && a.is_primary,
    );
    document.getElementById("cust-street").value = addr?.street || "";
    document.getElementById("cust-barangay").value = addr?.barangay || "";
    document.getElementById("cust-municipality").value = addr?.municipality || "";

    openModal("modal-customer");
}

function saveCustomer() {
    const firstName = document.getElementById("cust-first-name").value.trim();
    const middleName = document.getElementById("cust-middle-name").value.trim() || null;
    const lastName = document.getElementById("cust-last-name").value.trim();
    const contact = document.getElementById("cust-contact").value.trim() || null;
    const creditLimit = parseFloat(document.getElementById("cust-credit-limit").value) || 0;
    const street = document.getElementById("cust-street").value.trim() || null;
    const barangay = document.getElementById("cust-barangay").value.trim() || null;
    const municipality = document.getElementById("cust-municipality").value.trim() || null;
    const now = new Date().toISOString();

    if (!firstName || !lastName) {
        toast("First name and last name are required", "error");
        return;
    }

    if (editingCustomerId) {
        // Update existing customer
        const c = db.customers.find((x) => x.id === editingCustomerId);
        Object.assign(c, {
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            contact_number: contact,
            credit_limit: creditLimit,
            updated_at: now,
        });

        // Update or create primary address
        const addrIdx = db.customer_addresses.findIndex(
            (a) => a.customer_id === editingCustomerId && a.is_primary,
        );
        if (addrIdx >= 0) {
            Object.assign(db.customer_addresses[addrIdx], {
                street, barangay, municipality, updated_at: now,
            });
        } else if (street || barangay || municipality) {
            db.customer_addresses.push({
                id: newId("customer_addresses"),
                customer_id: editingCustomerId,
                street, barangay, municipality,
                is_primary: true,
                created_at: now, updated_at: now,
            });
        }

        toast(`Customer updated!`, "success");
    } else {
        // Create new customer
        const newCustomer = {
            id: newId("customers"),
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            contact_number: contact,
            credit_limit: creditLimit,
            is_deleted: false,
            created_at: now,
            updated_at: now,
        };
        db.customers.push(newCustomer);

        if (street || barangay || municipality) {
            db.customer_addresses.push({
                id: newId("customer_addresses"),
                customer_id: newCustomer.id,
                street, barangay, municipality,
                is_primary: true,
                created_at: now, updated_at: now,
            });
        }

        toast(`Customer "${firstName} ${lastName}" added!`, "success");
    }

    closeModal("modal-customer");
    persistDb();
    renderCustomersPage();
}

function deleteCustomer(customerId) {
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) return;

    const utang = getCustomerUtang(customerId);
    if (utang > 0) {
        toast("Cannot delete: customer has outstanding utang", "error");
        return;
    }

    if (!confirm(`Delete customer "${getCustomerFullName(c)}"? This cannot be undone.`)) return;

    c.is_deleted = true;
    c.updated_at = new Date().toISOString();
    persistDb();
    renderCustomersPage();
    toast(`Customer deleted`, "info");
}