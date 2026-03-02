/**
 * pos.js
 * Point of Sale — rewritten for new schema.
 *
 * Key schema mappings:
 *   Old: db.items[].item_name        → New: db.products[].name
 *   Old: db.items[].stock_quantity   → New: db.product_stock[product_id].quantity
 *   Old: db.item_units[]             → New: db.product_units[] (can_sell=true)
 *   Old: db.custom_pricing[]         → New: db.pricing_tiers[] (BUNDLE_PRICE tier)
 *   Old: db.transactions[]           → New: db.sales[] + db.sale_items[]
 *   Old: db.stock_logs[]             → New: db.stock_movements[]
 */

let cartModalProductUnitId = null; // product_units.id selected in the add-to-cart modal
let cart = [];
let posFilterCatId = null; // categories.id or null for "All"

// ─── POS category filter chips ─────────────────────────────────────────────────

function renderPOSCategories() {
  // Only show categories that have at least one non-deleted, sellable product
  const sellableProductIds = new Set(
    db.product_units.filter((u) => u.can_sell).map((u) => u.product_id),
  );
  const usedCatIds = new Set(
    db.products
      .filter((p) => !p.is_deleted && sellableProductIds.has(p.id))
      .map((p) => p.category_id),
  );
  const cats = db.categories.filter((c) => usedCatIds.has(c.id));

  const el = document.getElementById("pos-categories");
  el.innerHTML =
    `<div class="cat-chip ${!posFilterCatId ? "active" : ""}" onclick="setPosFilter(null)">All</div>` +
    cats
      .map(
        (c) =>
          `<div class="cat-chip ${c.id === posFilterCatId ? "active" : ""}" onclick="setPosFilter(${c.id})">${c.emoji || ""} ${c.name}</div>`,
      )
      .join("");
}

function setPosFilter(catId) {
  posFilterCatId = catId;
  renderPOSCategories();
  renderPOSItems();
}

// ─── POS item grid ────────────────────────────────────────────────────────────

function renderPOSItems() {
  renderPOSCategories();
  const q = document.getElementById("pos-search").value.toLowerCase();

  let products = db.products.filter((p) => !p.is_deleted);
  if (posFilterCatId)
    products = products.filter((p) => p.category_id === posFilterCatId);
  if (q) {
    products = products.filter((p) => {
      const catName = getProductCategoryName(p).toLowerCase();
      return p.name.toLowerCase().includes(q) || catName.includes(q);
    });
  }

  // Only show products that have at least one sellable unit
  products = products.filter((p) =>
    db.product_units.some((u) => u.product_id === p.id && u.can_sell),
  );

  const grid = document.getElementById("pos-grid");
  if (!products.length) {
    grid.innerHTML = '<div class="pos-empty">No items found</div>';
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const stockRow = getProductStock(product.id);
      const qty = stockRow ? stockRow.quantity : 0;
      const baseUnitName = getProductBaseUnitName(product);
      const threshold = getLowStockThreshold(product);
      const low = threshold > 0 && qty <= threshold;
      const outOfStock = qty <= 0;

      // Get default selling unit price for display
      const defUnit = getDefaultSellingUnit(product.id);
      const priceDisplay = defUnit
        ? (() => {
            const resolved = resolvePrice(defUnit.id, 1);
            return resolved
              ? `₱${formatPeso(resolved.unit_price)}/${defUnit.display_name}`
              : "";
          })()
        : "";

      return `<div class="item-card ${low && !outOfStock ? "low-stock" : ""} ${outOfStock ? "out-of-stock" : ""}"
        onclick="${outOfStock ? "" : `openCartModal(${product.id})`}">
        <div class="item-emoji">${product.emoji || "📦"}</div>
        <div class="item-name">${product.name}</div>
        <div class="item-stock">
          ${formatQty(qty)} ${baseUnitName}${
            outOfStock
              ? ' — <b style="color:var(--red)">Out</b>'
              : low
                ? ' — <span style="color:var(--orange)">Low</span>'
                : ""
          }
        </div>
        <div class="item-price">${priceDisplay}</div>
      </div>`;
    })
    .join("");
}

// ─── Add-to-cart modal ────────────────────────────────────────────────────────

function openCartModal(productId) {
  const product = db.products.find((p) => p.id === productId && !p.is_deleted);
  if (!product) return;

  document.getElementById("cart-modal-title").textContent = product.name;

  // Stock display
  const stockRow = getProductStock(productId);
  const stockQty = stockRow ? stockRow.quantity : 0;
  const baseUnitName = getProductBaseUnitName(product);
  const threshold = getLowStockThreshold(product);
  const stockInfoEl = document.getElementById("cart-stock-value");
  stockInfoEl.textContent = `${formatQty(stockQty)} ${baseUnitName}`;
  stockInfoEl.className = "cart-stock-value";
  if (stockQty <= 0) stockInfoEl.classList.add("out-of-stock");
  else if (threshold > 0 && stockQty <= threshold)
    stockInfoEl.classList.add("low-stock");

  // Build selling unit options
  const sellableUnits = getSellableUnits(productId);
  const defUnit = getDefaultSellingUnit(productId);
  cartModalProductUnitId = defUnit
    ? defUnit.id
    : sellableUnits[0]
      ? sellableUnits[0].id
      : null;

  const optEl = document.getElementById("cart-unit-options");
  optEl.innerHTML = sellableUnits
    .map((pu) => {
      const tiers = getActiveTiersForUnit(pu.id);
      const hasTier = tiers.length > 0;
      const isDefault = pu.id === cartModalProductUnitId;
      return `<div class="unit-option ${hasTier ? "custom" : ""} ${isDefault ? "active" : ""}"
        onclick="selectCartUnit(${pu.id}, this)">
        ${pu.display_name}${hasTier ? " 🏷️" : ""}
      </div>`;
    })
    .join("");

  document.getElementById("cart-qty").value = "1";
  document.getElementById("cart-manual-price").value = "";
  document.getElementById("cart-manual-check").checked = false;
  document.getElementById("manual-price-fields").style.display = "none";
  document.getElementById("manual-price-section").classList.remove("active");
  document.getElementById("stock-warning").style.display = "none";

  updateCartUnitUI();
  updateCartPreview();
  openModal("modal-add-cart");
}

function selectCartUnit(productUnitId, el) {
  cartModalProductUnitId = productUnitId;
  document
    .querySelectorAll("#cart-unit-options .unit-option")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("cart-qty").value = "1";
  updateCartUnitUI();
  updateCartPreview();
}

function updateCartUnitUI() {
  const pu = getProductUnit(cartModalProductUnitId);
  const label = pu ? pu.display_name : "unit";
  document.getElementById("manual-per-unit").textContent = label;

  // Show tier info in quantity label if applicable
  const tiers = cartModalProductUnitId
    ? getActiveTiersForUnit(cartModalProductUnitId)
    : [];
  const qtyLabel = document.getElementById("cart-qty-label");
  if (tiers.length) {
    const t = tiers[0];
    if (t.tier_type === "BUNDLE_PRICE") {
      qtyLabel.textContent = `Number of deals (${t.quantity_min} ${label} = ₱${formatPeso(t.total_price)})`;
    } else {
      qtyLabel.textContent = `Quantity (${t.label || "promo active"})`;
    }
  } else {
    qtyLabel.textContent = "Quantity";
  }

  document.getElementById("cart-manual-check").checked = false;
  document.getElementById("manual-price-fields").style.display = "none";
  document.getElementById("manual-price-section").classList.remove("active");
  document.getElementById("cart-manual-price").value = "";
}

function onManualPriceToggle() {
  const checked = document.getElementById("cart-manual-check").checked;
  document.getElementById("manual-price-fields").style.display = checked
    ? "block"
    : "none";
  document
    .getElementById("manual-price-section")
    .classList.toggle("active", checked);
  if (checked) {
    document.getElementById("cart-manual-price").focus();
  } else {
    document.getElementById("cart-manual-price").value = "";
  }
  updateCartPreview();
}

function updateCartPreview() {
  if (!cartModalProductUnitId) return;
  const qty = parseFloat(document.getElementById("cart-qty").value) || 0;
  const isManual = document.getElementById("cart-manual-check").checked;
  const manualPricePerUnit = parseFloat(
    document.getElementById("cart-manual-price").value,
  );

  const pu = getProductUnit(cartModalProductUnitId);
  if (!pu) return;
  const product = db.products.find((p) => p.id === pu.product_id);
  const stockRow = getProductStock(pu.product_id);
  const stockQty = stockRow ? stockRow.quantity : 0;
  const baseUnitName = getProductBaseUnitName(product);

  let price, label;
  const baseQty = toBaseUnits(pu, qty);

  if (isManual && !isNaN(manualPricePerUnit) && manualPricePerUnit >= 0) {
    price = manualPricePerUnit * qty;
    label = `${qty} ${pu.display_name} × ₱${formatPeso(manualPricePerUnit)} (manual)`;
    // Show normal price for comparison
    const normalResolved = resolvePrice(cartModalProductUnitId, qty);
    document.getElementById("normal-price-display").textContent = normalResolved
      ? `₱${formatPeso(normalResolved.total_price)}`
      : "—";
  } else {
    const result = calcPrice(cartModalProductUnitId, qty);
    price = result.price;
    label = result.label;
  }

  document.getElementById("preview-label").textContent = label;
  document.getElementById("preview-value").textContent =
    "₱" + formatPeso(price);

  // Stock warning
  const warn = document.getElementById("stock-warning");
  if (qty > 0 && baseQty > stockQty) {
    warn.style.display = "block";
    warn.textContent = `⚠️ Only ${formatQty(stockQty)} ${baseUnitName} in stock.`;
    document.getElementById("add-cart-btn").disabled = true;
  } else {
    warn.style.display = "none";
    document.getElementById("add-cart-btn").disabled = qty <= 0;
  }
}

function addToCart() {
  const qty = parseFloat(document.getElementById("cart-qty").value) || 0;
  if (qty <= 0 || !cartModalProductUnitId) {
    toast("Enter a valid quantity", "error");
    return;
  }

  const pu = getProductUnit(cartModalProductUnitId);
  if (!pu) return;
  const product = db.products.find((p) => p.id === pu.product_id);
  const stockRow = getProductStock(pu.product_id);
  const stockQty = stockRow ? stockRow.quantity : 0;
  const baseQty = toBaseUnits(pu, qty);

  if (baseQty > stockQty) {
    toast("Not enough stock!", "error");
    return;
  }

  const isManual = document.getElementById("cart-manual-check").checked;
  const manualPricePerUnit = parseFloat(
    document.getElementById("cart-manual-price").value,
  );

  let price, unit_price, label, is_manual_priced, manual_price_reason;

  if (isManual && !isNaN(manualPricePerUnit) && manualPricePerUnit >= 0) {
    unit_price = manualPricePerUnit;
    price = manualPricePerUnit * qty;
    const baseUnitName = getProductBaseUnitName(product);
    label = `${qty} ${pu.display_name} (${formatQty(baseQty)} ${baseUnitName}) × ₱${formatPeso(manualPricePerUnit)} (manual)`;
    is_manual_priced = true;
    manual_price_reason = "Cashier override";
  } else {
    const result = calcPrice(cartModalProductUnitId, qty);
    price = result.price;
    unit_price = result.unit_price;
    label = result.label;
    is_manual_priced = false;
    manual_price_reason = null;
  }

  cart.push({
    cartId: Date.now() + Math.floor(Math.random() * 10000), // Integer cartId prevents float ID issues in DOM
    product_id: product.id,
    product_unit_id: pu.id,
    item_name: product.name, // kept for display convenience
    emoji: product.emoji || "📦",
    unit_label: pu.display_name,
    qty,
    base_qty: baseQty,
    unit_price,
    price,
    detail: label,
    is_manual_priced,
    manual_price_reason,
    // weight_per_piece_kg: null — set if variable-weight item weighed at sale
  });

  closeModal("modal-add-cart");
  renderCart();
  toast(`${product.name} added to cart`, "success");
}

// ─── Cart rendering ───────────────────────────────────────────────────────────

function renderCart() {
  const el = document.getElementById("cart-items");
  if (!cart.length) {
    el.innerHTML =
      '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><div>No items yet.<br>Click an item to add.</div></div>';
    document.getElementById("checkout-btn").disabled = true;
    document.getElementById("cart-count").textContent = "0 items";
    document.getElementById("cart-subtotal").textContent = "₱0.00";
    document.getElementById("cart-total").textContent = "₱0.00";
    return;
  }

  el.innerHTML = cart
    .map((ci) => {
      const stockRow = getProductStock(ci.product_id);
      const stockQty = stockRow ? stockRow.quantity : 0;
      const overStock = ci.base_qty > stockQty;
      const manualBadge = ci.is_manual_priced
        ? `<span class="manual-badge">✏️ manual</span>`
        : "";

      return `<div class="cart-item" data-cart-id="${ci.cartId}">
      <span style="font-size:20px;flex-shrink:0;">${ci.emoji}</span>
      <div class="cart-item-info" style="flex:1;min-width:0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
          <div class="cart-item-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ci.item_name}${manualBadge}</div>
          <button class="cart-item-remove" onclick="removeFromCart('${ci.cartId}')" title="Remove">🗑</button>
        </div>
        <div class="cart-item-detail">${ci.detail || ci.unit_label}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <div class="qty-stepper">
            <button class="qty-btn minus" onclick="changeCartQty('${ci.cartId}', -1)" ${ci.qty <= 1 ? "disabled" : ""}>−</button>
            <input class="qty-input ${overStock ? "over-stock" : ""}"
              type="number" min="1" step="1" value="${ci.qty}"
              onchange="setCartQty('${ci.cartId}', parseFloat(this.value) || 1)"
              onblur="setCartQty('${ci.cartId}', parseFloat(this.value) || 1)">
            <button class="qty-btn" onclick="changeCartQty('${ci.cartId}', 1)">+</button>
            <span class="qty-unit-label">${ci.unit_label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="cart-inline-price-btn ${ci.is_manual_priced ? "active" : ""}"
              onclick="openInlineManualPrice('${ci.cartId}')"
              title="${ci.is_manual_priced ? `Manual: ₱${formatPeso(ci.unit_price)} per ${ci.unit_label}` : "Set manual price"}">✏️</button>
            <div class="cart-item-price" style="${overStock ? "color:var(--red)" : ci.is_manual_priced ? "color:var(--orange)" : ""}">₱${formatPeso(ci.price)}</div>
          </div>
        </div>
        ${overStock ? `<div style="font-size:11px;color:var(--red);margin-top:3px;">⚠️ Exceeds available stock</div>` : ""}
        <div id="inline-price-row-${ci.cartId}" style="display:none;margin-top:8px;"></div>
      </div>
    </div>`;
    })
    .join("");

  updateCartTotals();
}

function updateCartTotals() {
  const total = cart.reduce((s, i) => s + i.price, 0);
  document.getElementById("cart-count").textContent =
    `${cart.length} line${cart.length !== 1 ? "s" : ""}`;
  document.getElementById("cart-subtotal").textContent =
    "₱" + formatPeso(total);
  document.getElementById("cart-total").textContent = "₱" + formatPeso(total);
  document.getElementById("checkout-btn").disabled = cart.length === 0;
}

function changeCartQty(cartId, delta) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const newQty = Math.max(1, ci.qty + delta);
  applyCartQty(ci, newQty);
  renderCart();
}

function setCartQty(cartId, newQty) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  applyCartQty(ci, Math.max(1, parseFloat(newQty) || 1));
  renderCart();
}

function applyCartQty(ci, newQty) {
  const pu = getProductUnit(ci.product_unit_id);
  if (!pu) return;
  const product = db.products.find((p) => p.id === ci.product_id);
  ci.qty = newQty;
  ci.base_qty = toBaseUnits(pu, newQty);

  if (ci.is_manual_priced && ci.unit_price !== null) {
    ci.price = ci.unit_price * newQty;
    const baseUnitName = getProductBaseUnitName(product);
    ci.detail = `${newQty} ${ci.unit_label} (${formatQty(ci.base_qty)} ${baseUnitName}) × ₱${formatPeso(ci.unit_price)} (manual)`;
  } else {
    const result = calcPrice(ci.product_unit_id, newQty);
    ci.price = result.price;
    ci.unit_price = result.unit_price;
    ci.detail = result.label;
  }
}

function removeFromCart(cartId) {
  cart = cart.filter((i) => i.cartId != cartId);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

// ─── Inline manual price ──────────────────────────────────────────────────────

function openInlineManualPrice(cartId) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const rowEl = document.getElementById(`inline-price-row-${cartId}`);
  if (!rowEl) return;

  if (rowEl.style.display === "block") {
    rowEl.style.display = "none";
    return;
  }

  const normalResult = calcPrice(ci.product_unit_id, 1);
  const normalPerUnit = normalResult.unit_price;
  const currentVal = ci.is_manual_priced ? ci.unit_price : "";

  rowEl.style.display = "block";
  rowEl.innerHTML = `
    <div class="inline-price-form">
      <span style="font-size:12px;color:var(--orange);font-weight:600;white-space:nowrap;">₱ per ${ci.unit_label}</span>
      <input type="number" id="inline-price-input-${cartId}" step="0.01" min="0"
        value="${currentVal}" placeholder="${formatPeso(normalPerUnit)}"
        onkeydown="if(event.key==='Enter') applyInlineManualPrice('${cartId}')">
      <button class="btn btn-sm btn-success" onclick="applyInlineManualPrice('${cartId}')">Apply</button>
      ${ci.is_manual_priced ? `<button class="btn btn-sm btn-secondary" onclick="clearInlineManualPrice('${cartId}')">Clear</button>` : ""}
    </div>
    <div class="inline-price-note">Normal price: ₱${formatPeso(normalPerUnit)} per ${ci.unit_label}</div>
  `;
  document.getElementById(`inline-price-input-${cartId}`).focus();
}

function applyInlineManualPrice(cartId) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const val = parseFloat(
    document.getElementById(`inline-price-input-${cartId}`).value,
  );
  if (isNaN(val) || val < 0) {
    toast("Enter a valid price", "error");
    return;
  }
  const product = db.products.find((p) => p.id === ci.product_id);
  const baseUnitName = getProductBaseUnitName(product);
  ci.is_manual_priced = true;
  ci.unit_price = val;
  ci.price = val * ci.qty;
  ci.manual_price_reason = "Cashier override";
  ci.detail = `${ci.qty} ${ci.unit_label} (${formatQty(ci.base_qty)} ${baseUnitName}) × ₱${formatPeso(val)} (manual)`;
  renderCart();
  toast("Manual price applied", "success");
}

function clearInlineManualPrice(cartId) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  ci.is_manual_priced = false;
  ci.manual_price_reason = null;
  const result = calcPrice(ci.product_unit_id, ci.qty);
  ci.price = result.price;
  ci.unit_price = result.unit_price;
  ci.detail = result.label;
  renderCart();
  toast("Manual price removed", "info");
}

// ─── Checkout modal ───────────────────────────────────────────────────────────

// openCheckoutModal: Validates stock then shows payment method selection.
function openCheckoutModal() {
  if (!cart.length) return;

  // Pre-validate all stock before opening modal
  for (const ci of cart) {
    const stockRow = getProductStock(ci.product_id);
    const stockQty = stockRow ? stockRow.quantity : 0;
    if (ci.base_qty > stockQty) {
      toast(`Not enough stock for ${ci.item_name}!`, "error");
      return;
    }
  }

  const total = cart.reduce((s, i) => s + i.price, 0);

  // Populate checkout modal total
  document.getElementById("checkout-total-display").textContent =
    `₱${formatPeso(total)}`;

  // Reset modal state to Cash / walk-in defaults
  selectCheckoutPayment("cash");
  document.getElementById("checkout-customer-section").style.display = "none";
  document.getElementById("checkout-credit-info").style.display = "none";
  document.getElementById("checkout-customer-select").value = "";

  // Build customer dropdown from non-deleted customers with credit_limit > 0
  const creditCustomers = db.customers.filter(
    (c) => !c.is_deleted && c.credit_limit > 0,
  );
  const sel = document.getElementById("checkout-customer-select");
  sel.innerHTML =
    '<option value="">— Select customer —</option>' +
    creditCustomers
      .map(
        (c) =>
          `<option value="${c.id}">${c.first_name} ${c.last_name}${c.contact_number ? " · " + c.contact_number : ""}</option>`,
      )
      .join("");

  openModal("modal-checkout");
}

// selectCheckoutPayment: Switches UI between Cash and Credit payment modes.
function selectCheckoutPayment(method) {
  const cashBtn = document.getElementById("pay-btn-cash");
  const creditBtn = document.getElementById("pay-btn-credit");
  const customerSection = document.getElementById("checkout-customer-section");
  const creditInfo = document.getElementById("checkout-credit-info");

  if (method === "cash") {
    cashBtn.classList.add("active");
    creditBtn.classList.remove("active");
    customerSection.style.display = "none";
    creditInfo.style.display = "none";
    document.getElementById("checkout-customer-select").value = "";
  } else {
    creditBtn.classList.add("active");
    cashBtn.classList.remove("active");
    customerSection.style.display = "block";
    creditInfo.style.display = "none";
  }
}

// onCheckoutCustomerChange: Runs credit limit check when customer is selected.
function onCheckoutCustomerChange() {
  const customerId = parseInt(
    document.getElementById("checkout-customer-select").value,
  );
  const infoEl = document.getElementById("checkout-credit-info");

  if (!customerId) {
    infoEl.style.display = "none";
    return;
  }

  const customer = db.customers.find(
    (c) => c.id === customerId && !c.is_deleted,
  );
  if (!customer) return;

  const saleTotal = cart.reduce((s, i) => s + i.price, 0);

  // Schema Rule 5: SUM(amount_owed - amount_paid) for all non-PAID credits
  const outstanding = db.credit
    .filter((cr) => cr.customer_id === customerId && cr.status !== "PAID")
    .reduce((sum, cr) => sum + (cr.amount_owed - cr.amount_paid), 0);

  const projectedTotal = outstanding + saleTotal;
  const canApprove = projectedTotal <= customer.credit_limit;
  const remaining = customer.credit_limit - outstanding;

  infoEl.style.display = "block";
  infoEl.className = `checkout-credit-info ${canApprove ? "ok" : "over"}`;
  infoEl.innerHTML = `
    <div class="credit-info-row">
      <span>Credit Limit</span>
      <strong>₱${formatPeso(customer.credit_limit)}</strong>
    </div>
    <div class="credit-info-row">
      <span>Current Outstanding</span>
      <strong style="color:var(--orange);">₱${formatPeso(outstanding)}</strong>
    </div>
    <div class="credit-info-row">
      <span>This Sale</span>
      <strong>₱${formatPeso(saleTotal)}</strong>
    </div>
    <div class="credit-info-divider"></div>
    <div class="credit-info-row">
      <span>After This Sale</span>
      <strong style="color:${canApprove ? "var(--green)" : "var(--red)"};">₱${formatPeso(projectedTotal)}</strong>
    </div>
    ${
      canApprove
        ? `<div class="credit-info-status ok">✅ Approved — ₱${formatPeso(remaining - saleTotal)} remaining after this sale</div>`
        : `<div class="credit-info-status over">🚫 Exceeds credit limit by ₱${formatPeso(projectedTotal - customer.credit_limit)}</div>`
    }
  `;

  // Disable confirm button if over limit
  document.getElementById("confirm-checkout-btn").disabled = !canApprove;
}

// confirmCheckout: Reads modal state and calls the write function.
function confirmCheckout() {
  const isCash = document
    .getElementById("pay-btn-cash")
    .classList.contains("active");
  const paymentTypeId = isCash
    ? db.payment_types.find((p) => p.name === "Cash")?.id || 1
    : db.payment_types.find((p) => p.name === "Credit")?.id || 2;

  const customerId = isCash
    ? null
    : parseInt(document.getElementById("checkout-customer-select").value) ||
      null;

  if (!isCash && !customerId) {
    toast("Select a customer for credit sale", "error");
    return;
  }

  closeModal("modal-checkout");
  processCheckout(paymentTypeId, customerId);
}

// ─── Checkout write logic ─────────────────────────────────────────────────────

// processCheckout: Commits sale to db, handles cash/credit branches per schema.
function processCheckout(paymentTypeId, customerId) {
  if (!cart.length) return;

  // Final stock guard (re-check after modal was open)
  for (const ci of cart) {
    const stockRow = getProductStock(ci.product_id);
    const stockQty = stockRow ? stockRow.quantity : 0;
    if (ci.base_qty > stockQty) {
      toast(`Not enough stock for ${ci.item_name}!`, "error");
      return;
    }
  }

  const saleDate = new Date().toISOString();
  const userId = currentUser ? currentUser.id : null;
  const saleTotal = cart.reduce((s, i) => s + i.price, 0);
  const isCreditSale =
    paymentTypeId ===
    (db.payment_types.find((p) => p.name === "Credit")?.id || 2);

  // Credit re-validation at write time (schema Rule 5)
  if (isCreditSale && customerId) {
    const customer = db.customers.find(
      (c) => c.id === customerId && !c.is_deleted,
    );
    if (!customer) {
      toast("Customer not found", "error");
      return;
    }

    const outstanding = db.credit
      .filter((cr) => cr.customer_id === customerId && cr.status !== "PAID")
      .reduce((sum, cr) => sum + (cr.amount_owed - cr.amount_paid), 0);

    if (outstanding + saleTotal > customer.credit_limit) {
      toast(
        `Credit limit exceeded for ${customer.first_name} ${customer.last_name}`,
        "error",
      );
      return;
    }
  }

  // ── 1. Insert sales header ──────────────────────────────────────────────────
  const sale = {
    id: newId("sales"),
    customer_id: customerId,
    payment_type_id: paymentTypeId,
    sale_date: saleDate,
    notes: null,
    created_by: userId,
    created_at: saleDate,
    updated_at: saleDate,
  };
  db.sales.unshift(sale);

  // ── 2. Insert sale_items + stock_movements ──────────────────────────────────
  const saleReasonId =
    db.stock_log_reasons.find((r) => r.name === "Sale")?.id || 2;

  for (const ci of cart) {
    db.sale_items.unshift({
      id: newId("sale_items"),
      sale_id: sale.id,
      product_unit_id: ci.product_unit_id,
      quantity: ci.qty,
      unit_price: ci.unit_price,
      is_manual_priced: ci.is_manual_priced || false,
      manual_price_reason: ci.manual_price_reason || null,
      approved_by: null,
      weight_per_piece_kg: null,
      created_at: saleDate,
      // UI-only display cache fields (not in schema)
      _product_name: ci.item_name,
      _emoji: ci.emoji,
      _unit_label: ci.unit_label,
      _base_qty: ci.base_qty,
    });

    // recordStockMovement: Deducts base quantity and writes audit record.
    recordStockMovement({
      product_id: ci.product_id,
      stock_log_reason_id: saleReasonId,
      quantity_changed: -ci.base_qty,
      reference_type: "SALE",
      reference_id: sale.id,
      notes: `Sale #${String(sale.id).padStart(4, "0")}`,
    });
  }

  // ── 3a. Cash sale: log cash fund IN transaction ─────────────────────────────
  if (!isCreditSale && currentCashFund) {
    db.cash_fund_transactions.push({
      id: newId("cash_fund_transactions"),
      cash_fund_id: currentCashFund.id,
      transaction_type: "IN",
      amount: saleTotal,
      reference_type: "SALE",
      reference_id: sale.id,
      description: `Cash sale #${String(sale.id).padStart(4, "0")}`,
      created_by: userId,
      created_at: saleDate,
    });
  }

  // ── 3b. Credit sale: insert credit row (schema Rule 5) ──────────────────────
  if (isCreditSale && customerId) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30-day default due date
    db.credit.push({
      id: newId("credit"),
      sale_id: sale.id,
      customer_id: customerId, // intentionally redundant per schema note
      amount_owed: saleTotal,
      amount_paid: 0,
      due_date: dueDate.toISOString().split("T")[0],
      status: "PENDING",
      notes: null,
      created_at: saleDate,
      updated_at: saleDate,
    });
  }

  // ── 4. Finish ───────────────────────────────────────────────────────────────
  const payLabel = isCreditSale ? "Credit" : "Cash";
  toast(
    `✅ ${payLabel} sale complete! Total: ₱${formatPeso(saleTotal)}`,
    "success",
  );

  persistDb();
  clearCart();
  renderPOSItems();
  updateLowStockAlerts();
  renderRecentSales();

  if (document.getElementById("page-recentsales").classList.contains("active"))
    renderRecentSalesPage();
  if (document.getElementById("page-stocklogs").classList.contains("active"))
    renderStockLogsPage();
  if (document.getElementById("page-transactions").classList.contains("active"))
    renderTransactions();
}

// ─── Recent sales panel (bottom of cart) ─────────────────────────────────────

function renderRecentSales() {
  const el = document.getElementById("recent-sales-list");
  if (!el) return;

  // Get last 5 sales
  const recentSales = db.sales.slice(0, 5);
  if (!recentSales.length) {
    el.innerHTML = '<div class="recent-sales-empty">No sales yet.</div>';
    return;
  }

  let html = "";
  recentSales.forEach((sale) => {
    const d = new Date(sale.sale_date);
    const timeLabel = relativeTime(sale.sale_date);
    const dateStr = d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    html += `<div class="recent-sale-divider">${dateStr} ${timeStr}</div>`;

    const saleItems = db.sale_items.filter((si) => si.sale_id === sale.id);
    saleItems.forEach((si) => {
      const lineTotal = si.quantity * si.unit_price;
      html += `
        <div class="recent-sale-row" title="${dateStr} ${timeStr}">
          <span class="recent-sale-emoji">${si._emoji || "📦"}</span>
          <span class="recent-sale-name">${si._product_name || ""}</span>
          <span class="recent-sale-qty">${si.quantity} ${si._unit_label || ""}</span>
          <span class="recent-sale-price">₱${formatPeso(lineTotal)}</span>
          <span class="recent-sale-time">${timeLabel}</span>
        </div>`;
    });
  });

  el.innerHTML = html;
}
