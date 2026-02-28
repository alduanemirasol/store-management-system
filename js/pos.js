let cartModalItem = null;
let cartModalUnit = null;
let cart = [];
let posFilterCat = "";

function renderPOSCategories() {
  const usedCats = new Set(db.items.map((i) => i.category));
  const cats = db.categories.filter((c) => usedCats.has(c.name));
  const el = document.getElementById("pos-categories");
  el.innerHTML =
    `<div class="cat-chip ${!posFilterCat ? "active" : ""}" onclick="setPosFilter('All')">All</div>` +
    cats
      .map(
        (c) =>
          `<div class="cat-chip ${c.name === posFilterCat ? "active" : ""}" onclick="setPosFilter('${c.name}')">${c.emoji || ""} ${c.name}</div>`,
      )
      .join("");
}

function setPosFilter(cat) {
  posFilterCat = cat === "All" ? "" : cat;
  renderPOSCategories();
  renderPOSItems();
}

function renderPOSItems() {
  renderPOSCategories();
  const q = document.getElementById("pos-search").value.toLowerCase();
  let items = db.items;
  if (posFilterCat) items = items.filter((i) => i.category === posFilterCat);
  if (q)
    items = items.filter(
      (i) =>
        i.item_name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );

  const grid = document.getElementById("pos-grid");
  if (!items.length) {
    grid.innerHTML =
      '<div style="color:var(--text3);padding:20px;grid-column:1/-1;">No items found</div>';
    return;
  }
  grid.innerHTML = items
    .map((item) => {
      const low =
        item.low_stock_threshold &&
        item.stock_quantity <= item.low_stock_threshold;
      const outOfStock = item.stock_quantity <= 0;
      return `<div class="item-card ${low ? "low-stock" : ""}" onclick="openCartModal(${item.id})" style="${outOfStock ? "opacity:0.5;pointer-events:none;" : ""}">
      <div class="item-emoji">${item.emoji || "📦"}</div>
      <div class="item-name">${item.item_name}</div>
      <div class="item-stock">${formatStock(item)} ${item.base_unit}${outOfStock ? ' — <b style="color:var(--red)">Out</b>' : low ? ' — <span style="color:var(--orange)">Low</span>' : ""}</div>
      <div class="item-price">₱${item.selling_price_per_unit.toFixed(2)}/${item.base_unit}</div>
    </div>`;
    })
    .join("");
}

function openCartModal(itemId) {
  const item = db.items.find((i) => i.id === itemId);
  if (!item) return;
  cartModalItem = item;

  document.getElementById("cart-modal-title").textContent = item.item_name;

  const opts = [];
  opts.push({ type: "base", label: item.base_unit, id: "base" });
  db.item_units
    .filter((u) => u.item_id === item.id)
    .forEach((u) => {
      opts.push({ type: "unit", label: u.unit_name, id: "unit-" + u.id });
    });
  const activeCustom = getActiveCustomPricing(item.id);
  activeCustom.forEach((cp) => {
    opts.push({ type: "custom", label: cp.title, id: "custom-" + cp.id });
  });

  const defUnit = item.default_selling_unit || "base";
  const optEl = document.getElementById("cart-unit-options");
  optEl.innerHTML = opts
    .map(
      (o) => `
    <div class="unit-option ${o.type === "custom" ? "custom" : ""} ${o.id === defUnit ? "active" : ""}" 
         onclick="selectCartUnit('${o.id}', this)">${o.label}${o.type === "custom" ? " 🏷️" : ""}</div>
  `,
    )
    .join("");

  cartModalUnit = defUnit;
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

function selectCartUnit(unitId, el) {
  cartModalUnit = unitId;
  document
    .querySelectorAll("#cart-unit-options .unit-option")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("cart-qty").value = "1";
  updateCartUnitUI();
  updateCartPreview();
}

function updateCartUnitUI() {
  const isCustom = cartModalUnit && cartModalUnit.startsWith("custom-");
  const qtyLabel = document.getElementById("cart-qty-label");

  if (isCustom) {
    const cpId = parseInt(cartModalUnit.split("-")[1]);
    const cp = db.custom_pricing.find((c) => c.id === cpId);
    if (cp)
      qtyLabel.textContent = `Number of deals (1 deal = ${cp.quantity} ${cartModalItem.base_unit})`;
  } else {
    qtyLabel.textContent = "Quantity";
  }

  const unitLabel = getUnitLabel(cartModalItem, cartModalUnit);
  document.getElementById("manual-per-unit").textContent = unitLabel;
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
  if (!cartModalItem) return;
  const qty = parseFloat(document.getElementById("cart-qty").value) || 0;
  const isManual = document.getElementById("cart-manual-check").checked;
  const manualPricePerUnit = parseFloat(
    document.getElementById("cart-manual-price").value,
  );

  let price, label;
  if (isManual && !isNaN(manualPricePerUnit) && manualPricePerUnit >= 0) {
    price = manualPricePerUnit * qty;
    const unitLabel = getUnitLabel(cartModalItem, cartModalUnit);
    label = `${qty} ${unitLabel} × ₱${manualPricePerUnit.toFixed(2)} (manual)`;
  } else {
    const result = calcPrice(cartModalItem, cartModalUnit, qty);
    price = result.price;
    label = result.label;
  }

  if (isManual) {
    const { price: normalPrice } = calcPrice(cartModalItem, cartModalUnit, qty);
    document.getElementById("normal-price-display").textContent =
      `₱${normalPrice.toFixed(2)}`;
  }

  document.getElementById("preview-label").textContent = label;
  document.getElementById("preview-value").textContent = "₱" + price.toFixed(2);

  const baseQty = toBaseUnits(cartModalItem, cartModalUnit, qty);
  const warn = document.getElementById("stock-warning");
  if (qty > 0 && baseQty > cartModalItem.stock_quantity) {
    warn.style.display = "block";
    warn.style.background = "var(--orange-light)";
    warn.style.color = "var(--orange)";
    warn.textContent = `⚠️ Only ${formatStock(cartModalItem)} ${cartModalItem.base_unit} in stock.`;
    document.getElementById("add-cart-btn").disabled = true;
  } else {
    warn.style.display = "none";
    document.getElementById("add-cart-btn").disabled = false;
  }
}

function calcPrice(item, unitId, qty) {
  if (!unitId || unitId === "base") {
    return {
      price: item.selling_price_per_unit * qty,
      label: `${qty} ${item.base_unit}`,
    };
  }
  if (unitId.startsWith("custom-")) {
    const cpId = parseInt(unitId.split("-")[1]);
    const cp = db.custom_pricing.find((c) => c.id === cpId);
    if (cp) return { price: cp.price * qty, label: `${qty} × ${cp.title}` };
  }
  if (unitId.startsWith("unit-")) {
    const uid = parseInt(unitId.split("-")[1]);
    const u = db.item_units.find((x) => x.id === uid);
    if (u) {
      const baseQty = toBaseUnits(item, unitId, qty);
      // Show total in base unit (e.g., kg, pieces, mL)
      return { price: u.selling_price * qty, label: `${qty} ${u.unit_name} (${baseQty.toFixed(1)} ${item.base_unit})` };
    }
  }
  return { price: 0, label: "" };
}

function addToCart() {
  const qty = parseFloat(document.getElementById("cart-qty").value) || 0;
  if (qty <= 0) {
    toast("Enter a valid quantity", "error");
    return;
  }

  const item = cartModalItem;
  const unitId = cartModalUnit;
  const baseQty = toBaseUnits(item, unitId, qty);
  if (baseQty > item.stock_quantity) {
    toast("Not enough stock!", "error");
    return;
  }

  const isManual = document.getElementById("cart-manual-check").checked;
  const manualPricePerUnit = parseFloat(
    document.getElementById("cart-manual-price").value,
  );

  let price, label;
  if (isManual && !isNaN(manualPricePerUnit) && manualPricePerUnit >= 0) {
    price = manualPricePerUnit * qty;
    const unitLabel = getUnitLabel(item, unitId);
    const baseQty = toBaseUnits(item, unitId, qty);
    // Show total in base unit
    label = `${qty} ${unitLabel} (${baseQty.toFixed(1)} ${item.base_unit}) × ₱${manualPricePerUnit.toFixed(2)} (manual)`;
  } else {
    const result = calcPrice(item, unitId, qty);
    price = result.price;
    label = result.label;
  }

  const base_qty_per_unit = qty > 0 ? baseQty / qty : 0;

  cart.push({
    cartId: Date.now() + Math.random(),
    item_id: item.id,
    item_name: item.item_name,
    unit_id: unitId,
    qty: qty,
    base_qty: baseQty,
    base_qty_per_unit: base_qty_per_unit,
    unit_label: getUnitLabel(item, unitId),
    price: price,
    detail: label,
    emoji: item.emoji || "📦",
    is_manual: isManual && !isNaN(manualPricePerUnit),
    manual_price_per_unit:
      isManual && !isNaN(manualPricePerUnit) ? manualPricePerUnit : null,
  });

  closeModal("modal-add-cart");
  renderCart();
  toast(`${item.item_name} added to cart`, "success");
}

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
      const item = db.items.find((i) => i.id === ci.item_id);
      const overStock = ci.base_qty > (item ? item.stock_quantity : 0);
      const manualBadge = ci.is_manual
        ? `<span class="manual-badge">✏️ manual</span>`
        : "";

      return `
    <div class="cart-item" data-cart-id="${ci.cartId}">
      <span style="font-size:20px;flex-shrink:0;">${ci.emoji}</span>
      <div class="cart-item-info" style="flex:1;min-width:0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
          <div class="cart-item-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ci.item_name}${manualBadge}</div>
          <button class="cart-item-remove" onclick="removeFromCart('${ci.cartId}')" title="Remove item">🗑</button>
        </div>
        <div class="cart-item-detail">${ci.detail || ci.unit_label}${ci.unit_id && ci.unit_id.startsWith("custom-") ? " 🏷️" : ""}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <div class="qty-stepper">
            <button class="qty-btn minus" onclick="changeCartQty('${ci.cartId}', -1)" ${ci.qty <= getMinStep(ci) ? "disabled" : ""}>−</button>
            <input class="qty-input ${overStock ? "over-stock" : ""}"
              type="number" min="${getMinStep(ci)}" step="${getMinStep(ci)}"
              value="${ci.qty}"
              onchange="setCartQty('${ci.cartId}', parseFloat(this.value) || ${getMinStep(ci)})"
              onblur="setCartQty('${ci.cartId}', parseFloat(this.value) || ${getMinStep(ci)})"
            >
            <button class="qty-btn" onclick="changeCartQty('${ci.cartId}', 1)">+</button>
            <span class="qty-unit-label">${ci.unit_label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="cart-inline-price-btn ${ci.is_manual ? "active" : ""}"
              onclick="openInlineManualPrice('${ci.cartId}')"
              title="${ci.is_manual ? `Manual: ₱${ci.manual_price_per_unit.toFixed(2)} per ${ci.unit_label} — click to edit` : "Set manual price"}">✏️</button>
            <div class="cart-item-price" style="${overStock ? "color:var(--red)" : ci.is_manual ? "color:var(--orange)" : ""}">₱${ci.price.toFixed(2)}</div>
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

function getMinStep(ci) {
  return ci.unit_id && ci.unit_id.startsWith("custom-")
    ? 1
    : Number.isInteger(ci.qty)
      ? 1
      : 0.01;
}

function updateCartTotals() {
  const total = cart.reduce((s, i) => s + i.price, 0);
  document.getElementById("cart-count").textContent =
    `${cart.length} line${cart.length !== 1 ? "s" : ""}`;
  document.getElementById("cart-subtotal").textContent = "₱" + total.toFixed(2);
  document.getElementById("cart-total").textContent = "₱" + total.toFixed(2);
  document.getElementById("checkout-btn").disabled = cart.length === 0;
}

function changeCartQty(cartId, delta) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const step = getMinStep(ci);
  const newQty = Math.max(step, parseFloat((ci.qty + delta * step).toFixed(4)));
  applyCartQty(ci, newQty);
  renderCart();
}

function setCartQty(cartId, newQty) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const step = getMinStep(ci);
  const clamped = Math.max(step, parseFloat((newQty || step).toFixed(4)));
  applyCartQty(ci, clamped);
  renderCart();
}

function applyCartQty(ci, newQty) {
  const item = db.items.find((i) => i.id === ci.item_id);
  if (!item) return;
  ci.qty = newQty;
  ci.base_qty = toBaseUnits(item, ci.unit_id, newQty);

  if (ci.is_manual && ci.manual_price_per_unit !== null) {
    ci.price = ci.manual_price_per_unit * newQty;
    // Show total in base unit
    const baseQty = toBaseUnits(item, ci.unit_id, newQty);
    ci.detail = `${newQty} ${ci.unit_label} (${baseQty.toFixed(1)} ${item.base_unit}) × ₱${ci.manual_price_per_unit.toFixed(2)} (manual)`;
  } else {
    const { price, label } = calcPrice(item, ci.unit_id, newQty);
    ci.price = price;
    ci.detail = label;
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

function openInlineManualPrice(cartId) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const rowEl = document.getElementById(`inline-price-row-${cartId}`);
  if (!rowEl) return;

  if (rowEl.style.display === "block") {
    rowEl.style.display = "none";
    return;
  }

  const item = db.items.find((i) => i.id === ci.item_id);
  const normalResult = calcPrice(item, ci.unit_id, 1);
  const normalPerUnit = normalResult.price;
  const currentVal = ci.is_manual ? ci.manual_price_per_unit : "";

  rowEl.style.display = "block";
  rowEl.innerHTML = `
    <div class="inline-price-form">
      <span style="font-size:12px;color:var(--orange);font-weight:600;white-space:nowrap;">₱ per ${ci.unit_label}</span>
      <input type="number" id="inline-price-input-${cartId}" step="0.01" min="0"
        value="${currentVal}" placeholder="${normalPerUnit.toFixed(2)}"
        onkeydown="if(event.key==='Enter') applyInlineManualPrice('${cartId}')">
      <button class="btn btn-sm btn-success" onclick="applyInlineManualPrice('${cartId}')">Apply</button>
      ${ci.is_manual ? `<button class="btn btn-sm btn-secondary" onclick="clearInlineManualPrice('${cartId}')">Clear</button>` : ""}
    </div>
    <div class="inline-price-note">Normal price: ₱${normalPerUnit.toFixed(2)} per ${ci.unit_label}</div>
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
  ci.is_manual = true;
  ci.manual_price_per_unit = val;
  ci.price = val * ci.qty;
  // Show total in base unit
  const item = db.items.find((i) => i.id === ci.item_id);
  const baseQty = toBaseUnits(item, ci.unit_id, ci.qty);
  ci.detail = `${ci.qty} ${ci.unit_label} (${baseQty.toFixed(1)} ${item.base_unit}) × ₱${val.toFixed(2)} (manual)`;
  renderCart();
  toast("Manual price applied", "success");
}

function clearInlineManualPrice(cartId) {
  const ci = cart.find((i) => i.cartId == cartId);
  if (!ci) return;
  const item = db.items.find((i) => i.id === ci.item_id);
  ci.is_manual = false;
  ci.manual_price_per_unit = null;
  const { price, label } = calcPrice(item, ci.unit_id, ci.qty);
  ci.price = price;
  ci.detail = label;
  renderCart();
  toast("Manual price removed", "info");
}

function checkout() {
  if (!cart.length) return;

  // First pass: validate all stock levels before deducting anything
  for (const ci of cart) {
    const item = db.items.find((i) => i.id === ci.item_id);
    if (!item) continue;
    if (ci.base_qty > item.stock_quantity) {
      toast(`Not enough stock for ${item.item_name}!`, "error");
      return;
    }
  }

  // Second pass: deduct stock only after all checks pass
  for (const ci of cart) {
    const item = db.items.find((i) => i.id === ci.item_id);
    if (!item) continue;
    item.stock_quantity -= ci.base_qty;
  }

  const txn = {
    id: newId("transactions"),
    date: new Date().toISOString(),
    items: [...cart],
    total: cart.reduce((s, i) => s + i.price, 0),
  };
  db.transactions.unshift(txn);

  const saleDate = txn.date;
  for (const ci of txn.items) {
    db.stock_logs.unshift({
      id: newId("stock_logs"),
      date: saleDate,
      item_id: ci.item_id,
      item_name: ci.item_name,
      emoji: ci.emoji || "📦",
      change_type: "sale",
      qty_change: -ci.base_qty,
      unit_label: ci.unit_label || "",
      qty_display: ci.qty,
      ref_id: txn.id,
      note: `Order #${String(txn.id).padStart(4, "0")}`,
    });
  }

  toast(`✅ Checkout complete! Total: ₱${txn.total.toFixed(2)}`, "success");
  persistDb();
  clearCart();
  renderPOSItems();
  updateLowStockAlerts();
  renderRecentSales();
  if (document.getElementById("page-recentsales").classList.contains("active"))
    renderRecentSalesPage();
  if (document.getElementById("page-stocklogs").classList.contains("active"))
    renderStockLogsPage();
}

function renderRecentSales() {
  const el = document.getElementById("recent-sales-list");
  if (!el) return;

  const recentTxns = db.transactions.slice(0, 5);
  if (!recentTxns.length) {
    el.innerHTML = '<div class="recent-sales-empty">No sales yet.</div>';
    return;
  }

  let html = "";
  recentTxns.forEach((txn) => {
    const d = new Date(txn.date);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    let timeLabel;
    if (diffMin < 1) timeLabel = "Just now";
    else if (diffMin < 60) timeLabel = diffMin + "m ago";
    else if (diffMin < 1440) timeLabel = Math.floor(diffMin / 60) + "h ago";
    else
      timeLabel = d.toLocaleDateString([], { month: "short", day: "numeric" });

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
    txn.items.forEach((ci) => {
      html += `
        <div class="recent-sale-row" title="${dateStr} ${timeStr}">
            <span class="recent-sale-emoji">${ci.emoji || "📦"}</span>
            <span class="recent-sale-name">${ci.item_name}</span>
            <span class="recent-sale-qty">${ci.qty} ${ci.unit_label || ""}</span>
            <span class="recent-sale-price">₱${ci.price.toFixed(2)}</span>
            <span class="recent-sale-time">${timeLabel}</span>
        </div>`;
    });
  });

  el.innerHTML = html;
}