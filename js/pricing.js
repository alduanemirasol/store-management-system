// ===================== CUSTOM PRICING =====================

function renderPricingPage() {
  const el = document.getElementById("pricing-list");
  if (!db.custom_pricing.length) {
    el.innerHTML = `<div class="card"><p class="helper">No custom pricing yet. Click "+ Add Custom Price" to create one.</p></div>`;
    return;
  }

  // Group by item
  const grouped = {};
  db.custom_pricing.forEach((cp) => {
    const item = db.items.find((i) => i.id === cp.item_id);
    const key = item ? item.item_name : "Unknown";
    if (!grouped[key]) grouped[key] = { item, list: [] };
    grouped[key].list.push(cp);
  });

  el.innerHTML = Object.entries(grouped)
    .map(
      ([name, g]) => `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <span class="card-title">${g.item?.emoji || "📦"} ${name}</span>
      </div>
      ${g.list
        .map((cp) => {
          const item = g.item;
          return `<div class="cp-item">
            <div class="cp-info">
              <h4>${cp.title} ${
                cp.active
                  ? '<span class="badge badge-green">Active</span>'
                  : '<span class="badge badge-red">Inactive</span>'
              }</h4>
              <p>${cp.quantity} ${item?.base_unit || "units"} for ₱${cp.price.toFixed(2)} (₱${(cp.price / cp.quantity).toFixed(2)}/unit)</p>
              ${cp.note ? `<p>${cp.note}</p>` : ""}
              ${cp.start_date || cp.end_date ? `<div class="cp-dates">📅 ${cp.start_date || "—"} → ${cp.end_date || "—"}</div>` : ""}
              <div class="cp-actions">
                <button class="btn btn-sm btn-secondary" onclick="toggleCustomPricing(${cp.id})">${cp.active ? "Deactivate" : "Activate"}</button>
                <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);" onclick="deleteCustomPricing(${cp.id})">Delete</button>
              </div>
            </div>
            <div class="cp-price">₱${cp.price.toFixed(2)}</div>
          </div>`;
        })
        .join("")}
    </div>`,
    )
    .join("");
}

function openAddPricingModal() {
  document.getElementById("cp-modal-title").textContent = "Add Custom Pricing";
  document.getElementById("cp-item").innerHTML =
    '<option value="">— Select item —</option>' +
    db.items
      .map(
        (i) =>
          `<option value="${i.id}">${i.emoji || ""} ${i.item_name}</option>`,
      )
      .join("");
  document.getElementById("cp-title").value = "";
  document.getElementById("cp-qty").value = "";
  document.getElementById("cp-price").value = "";
  document.getElementById("cp-start").value = "";
  document.getElementById("cp-end").value = "";
  document.getElementById("cp-note").value = "";
  document.getElementById("cp-active").checked = true;
  openModal("modal-custom-price");
}

function saveCustomPricing() {
  const itemId = parseInt(document.getElementById("cp-item").value);
  const title = document.getElementById("cp-title").value.trim();
  const qty = parseFloat(document.getElementById("cp-qty").value);
  const price = parseFloat(document.getElementById("cp-price").value);

  if (!itemId || !title || !qty || !price) {
    toast("Fill in all required fields", "error");
    return;
  }

  db.custom_pricing.push({
    id: newId("custom_pricing"),
    item_id: itemId,
    title,
    quantity: qty,
    price,
    note: document.getElementById("cp-note").value,
    active: document.getElementById("cp-active").checked,
    start_date: document.getElementById("cp-start").value,
    end_date: document.getElementById("cp-end").value,
  });
  toast("Custom pricing saved!", "success");
  closeModal("modal-custom-price");
  renderPricingPage();
}

function toggleCustomPricing(cpId) {
  const cp = db.custom_pricing.find((c) => c.id === cpId);
  if (cp) {
    cp.active = !cp.active;
    renderPricingPage();
    toast(`Pricing ${cp.active ? "activated" : "deactivated"}`, "info");
  }
}

function deleteCustomPricing(cpId) {
  db.custom_pricing = db.custom_pricing.filter((c) => c.id !== cpId);
  renderPricingPage();
  toast("Custom pricing deleted", "info");
}
