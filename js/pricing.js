/**
 * pricing.js
 * Custom pricing / pricing tiers — rewritten for new schema.
 *
 * Old: db.custom_pricing[] (simple bundle deals)
 * New: db.pricing_tiers[] with tier_type: BUNDLE_PRICE | VOLUME_DISCOUNT | FLAT_RATE
 *
 * product_unit_id is the FK now (instead of item_id + quantity pairing).
 */

function renderPricingPage() {
  const el = document.getElementById("pricing-list");
  const today = new Date().toISOString().split("T")[0];

  if (!db.pricing_tiers.length) {
    el.innerHTML = `<div class="card"><p class="helper">No pricing tiers yet. Click "+ Add Pricing Tier" to create one.</p></div>`;
    return;
  }

  // Group by product
  const grouped = {};
  db.pricing_tiers.forEach((tier) => {
    const pu = db.product_units.find((u) => u.id === tier.product_unit_id);
    if (!pu) return;
    const product = db.products.find((p) => p.id === pu.product_id && !p.is_deleted);
    if (!product) return;
    const key = product.id;
    if (!grouped[key]) grouped[key] = { product, list: [] };
    grouped[key].list.push({ tier, pu });
  });

  if (!Object.keys(grouped).length) {
    el.innerHTML = `<div class="card"><p class="helper">No pricing tiers yet. Click "+ Add Pricing Tier" to create one.</p></div>`;
    return;
  }

  el.innerHTML = Object.values(grouped).map(({ product, list }) => {
    const baseUnitName = getProductBaseUnitName(product);
    return `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <span class="card-title">${product.emoji || "📦"} ${product.name}</span>
      </div>
      ${list.map(({ tier, pu }) => {
      const isActive = tier.effective_from <= today &&
        (tier.effective_to === null || tier.effective_to >= today);
      const statusBadge = isActive
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-red">Inactive</span>';

      let priceDesc = "";
      if (tier.tier_type === "BUNDLE_PRICE") {
        priceDesc = `${tier.quantity_min} ${pu.display_name} for ₱${formatPeso(tier.total_price)}`;
      } else if (tier.tier_type === "VOLUME_DISCOUNT") {
        priceDesc = `${tier.quantity_min}${tier.quantity_max < 999999 ? "–" + tier.quantity_max : "+"} ${pu.display_name} @ ₱${formatPeso(tier.price_per_unit)} each`;
      } else { // FLAT_RATE
        priceDesc = `₱${formatPeso(tier.price_per_unit)} per ${pu.display_name} (flat rate)`;
      }

      const tierTypeBadge = {
        BUNDLE_PRICE: '<span class="badge badge-blue">Bundle</span>',
        VOLUME_DISCOUNT: '<span class="badge badge-orange">Volume</span>',
        FLAT_RATE: '<span class="badge badge-yellow">Flat Rate</span>',
      }[tier.tier_type] || "";

      return `<div class="cp-item">
          <div class="cp-info">
            <h4>${tier.label || priceDesc} ${statusBadge} ${tierTypeBadge}</h4>
            <p>${priceDesc}</p>
            ${tier.effective_from || tier.effective_to
          ? `<div class="cp-dates">📅 ${tier.effective_from || "—"} → ${tier.effective_to || "open-ended"}</div>`
          : ""}
            <div class="cp-actions">
              <button class="btn btn-sm btn-secondary" onclick="deletePricingTier(${tier.id})">Delete</button>
            </div>
          </div>
          <div class="cp-price">
            ${tier.tier_type === "BUNDLE_PRICE"
          ? `₱${formatPeso(tier.total_price)}`
          : `₱${formatPeso(tier.price_per_unit)}/${pu.display_name}`}
          </div>
        </div>`;
    }).join("")}
    </div>`;
  }).join("");
}

function openAddPricingModal() {
  document.getElementById("cp-modal-title").textContent = "Add Pricing Tier";

  // Product selector
  document.getElementById("cp-product").innerHTML =
    '<option value="">— Select product —</option>' +
    db.products
      .filter((p) => !p.is_deleted)
      .map((p) => `<option value="${p.id}">${p.emoji || ""} ${p.name}</option>`)
      .join("");

  document.getElementById("cp-unit").innerHTML = '<option value="">— Select product first —</option>';
  document.getElementById("cp-tier-type").value = "BUNDLE_PRICE";
  document.getElementById("cp-label").value = "";
  document.getElementById("cp-qty-min").value = "";
  document.getElementById("cp-qty-max").value = "999999";
  document.getElementById("cp-price-per-unit").value = "";
  document.getElementById("cp-total-price").value = "";
  document.getElementById("cp-from").value = new Date().toISOString().split("T")[0];
  document.getElementById("cp-to").value = "";
  updatePricingTierTypeUI();
  openModal("modal-custom-price");
}

function onPricingProductChange() {
  const productId = parseInt(document.getElementById("cp-product").value);
  const unitSel = document.getElementById("cp-unit");
  if (!productId) {
    unitSel.innerHTML = '<option value="">— Select product first —</option>';
    return;
  }
  const sellableUnits = getSellableUnits(productId);
  unitSel.innerHTML =
    '<option value="">— Select unit —</option>' +
    sellableUnits.map((u) => `<option value="${u.id}">${u.display_name}</option>`).join("");
}

function updatePricingTierTypeUI() {
  const tierType = document.getElementById("cp-tier-type").value;
  const bundleFields = document.getElementById("cp-bundle-fields");
  const volumeFields = document.getElementById("cp-volume-fields");

  if (tierType === "BUNDLE_PRICE") {
    bundleFields.style.display = "block";
    volumeFields.style.display = "none";
  } else {
    bundleFields.style.display = "none";
    volumeFields.style.display = "block";
  }
}

function savePricingTier() {
  const productId = parseInt(document.getElementById("cp-product").value);
  const productUnitId = parseInt(document.getElementById("cp-unit").value);
  const tierType = document.getElementById("cp-tier-type").value;
  const label = document.getElementById("cp-label").value.trim();
  const effectiveFrom = document.getElementById("cp-from").value;
  const effectiveTo = document.getElementById("cp-to").value || null;
  const userId = currentUser ? currentUser.id : null;
  const now = new Date().toISOString();

  if (!productId || !productUnitId || !tierType) {
    toast("Select a product, unit, and tier type", "error");
    return;
  }

  let qtyMin, qtyMax, pricePerUnit, totalPrice;

  if (tierType === "BUNDLE_PRICE") {
    qtyMin = parseInt(document.getElementById("cp-qty-min").value);
    qtyMax = qtyMin; // bundle is exact qty
    totalPrice = parseFloat(document.getElementById("cp-total-price").value);
    if (!qtyMin || isNaN(totalPrice)) { toast("Fill in quantity and total price", "error"); return; }
    pricePerUnit = null;
  } else {
    qtyMin = parseInt(document.getElementById("cp-qty-min-v").value) || 1;
    qtyMax = parseInt(document.getElementById("cp-qty-max").value) || 999999;
    pricePerUnit = parseFloat(document.getElementById("cp-price-per-unit").value);
    if (isNaN(pricePerUnit)) { toast("Fill in the price per unit", "error"); return; }
    totalPrice = null;
  }

  db.pricing_tiers.push({
    id: newId("pricing_tiers"),
    product_unit_id: productUnitId,
    label: label || null,
    tier_type: tierType,
    quantity_min: qtyMin,
    quantity_max: qtyMax,
    price_per_unit: pricePerUnit,
    total_price: totalPrice,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    created_by: userId,
    updated_by: null,
    created_at: now,
    updated_at: now,
  });

  toast("Pricing tier saved!", "success");
  persistDb();
  closeModal("modal-custom-price");
  renderPricingPage();
}

function deletePricingTier(tierId) {
  db.pricing_tiers = db.pricing_tiers.filter((t) => t.id !== tierId);
  persistDb();
  renderPricingPage();
  toast("Pricing tier deleted", "info");
}