/**
 * inventory.js
 * Inventory management — rewritten for new schema.
 *
 * Key mappings:
 *   Old: db.items[]              → New: db.products[]
 *   Old: db.item_units[]         → New: db.product_units[]
 *   Old: item.stock_quantity     → New: db.product_stock[product_id].quantity
 *   Old: item.base_unit          → New: db.units[base_unit_id].name
 *   Old: item.selling_price_per_unit → New: product_unit_prices.selling_price for base unit
 *   Old: item.low_stock_threshold    → New: product.low_stock_threshold (UI extension kept on product)
 */

let editingProductId = null;
let itemModalVariants = []; // product_units being edited

function renderInventory() {
  const q = document.getElementById("inv-search").value.toLowerCase();
  const catEl = document.getElementById("inv-cat-filter");
  const catId = catEl.value ? parseInt(catEl.value) : null;

  // Repopulate category filter preserving selection
  catEl.innerHTML =
    '<option value="">All Categories</option>' +
    db.categories
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === catId ? "selected" : ""}>${c.emoji || ""} ${c.name}</option>`,
      )
      .join("");

  let products = db.products.filter((p) => !p.is_deleted);
  if (catId) products = products.filter((p) => p.category_id === catId);
  if (q)
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        getProductCategoryName(p).toLowerCase().includes(q),
    );

  const tbody = document.getElementById("inv-tbody");
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="page-empty">No items found.</td></tr>`;
    updateInventoryLowStockPanel(getLowStockProducts());
    return;
  }

  tbody.innerHTML = products
    .map((product) => {
      const stockRow = getProductStock(product.id);
      const qty = stockRow ? stockRow.quantity : 0;
      const baseUnitName = getProductBaseUnitName(product);
      const threshold = getLowStockThreshold(product);
      const low = threshold > 0 && qty <= threshold;
      const out = qty <= 0;

      // Get base product_unit and its price
      const baseUnit = db.product_units.find(
        (u) => u.product_id === product.id && u.display_name === baseUnitName,
      );
      const basePriceRow = baseUnit ? getActiveUnitPrice(baseUnit.id) : null;
      const buyPrice = basePriceRow ? basePriceRow.purchase_price : 0;
      const sellPrice = basePriceRow ? basePriceRow.selling_price : 0;

      // Category badge
      const cat = db.categories.find((c) => c.id === product.category_id);
      const catColor = getCatUIColor(product.category_id);

      // Pack units summary (non-base units)
      const packUnits = db.product_units.filter(
        (u) => u.product_id === product.id && u.pack_quantity !== 1,
      );

      const stockColor = out
        ? "color:var(--red)"
        : low
          ? "color:var(--orange)"
          : "";

      return `<tr>
      <td><strong>${product.emoji || "📦"} ${product.name}</strong></td>
      <td><span class="badge badge-${catColor}">${cat ? (cat.emoji || "") + " " + cat.name : "—"}</span></td>
      <td><span style="color:var(--text3);">${baseUnitName}</span></td>
      <td>
        <strong ${stockColor ? `style="${stockColor}"` : ""}>${formatQty(qty)} ${baseUnitName}</strong>
        ${packUnits.length ? `<br><span style="font-size:11px;color:var(--text3);">${packUnits.map((u) => `1 ${u.display_name} = ${u.pack_quantity} ${baseUnitName}`).join(", ")}</span>` : ""}
        ${out ? '<br><span class="badge badge-red">Out of Stock</span>' : low ? '<br><span class="badge badge-orange">Low Stock</span>' : ""}
      </td>
      <td>₱${formatPeso(buyPrice)}<span style="color:var(--text3);font-size:12px;">/${baseUnitName}</span></td>
      <td>₱${formatPeso(sellPrice)}<span style="color:var(--text3);font-size:12px;">/${baseUnitName}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editItem(${product.id})">Edit</button>
          <button class="btn btn-sm" style="background:var(--green-light);color:var(--green);" onclick="quickRestock(${product.id})">Restock</button>
          <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);" onclick="deleteItem(${product.id})">Delete</button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  updateInventoryLowStockPanel(getLowStockProducts());
}

function quickRestock(productId) {
  openRestockModal(productId);
}

function deleteItem(productId) {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return;
  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  // Soft delete
  product.is_deleted = true;
  product.updated_at = new Date().toISOString();

  persistDb();
  toast("Item deleted!", "success");
  renderInventory();
  updateLowStockAlerts();
}

// ─── Unit selector helpers (mirrors old onBaseUnitSelectChange) ───────────────

function onBaseUnitSelectChange() {
  const sel = document.getElementById("item-base-unit-select");
  const customInput = document.getElementById("item-base-unit-custom");
  const hidden = document.getElementById("item-base-unit");

  if (sel.value === "__custom__") {
    customInput.style.display = "block";
    customInput.focus();
    hidden.value = customInput.value.trim();
  } else {
    customInput.style.display = "none";
    hidden.value = sel.value; // unit name string
  }
  _applyUnitToForm(hidden.value);
}

function onBaseUnitCustomInput() {
  const val = document.getElementById("item-base-unit-custom").value.trim();
  document.getElementById("item-base-unit").value = val;
  _applyUnitToForm(val);
}

function setBaseUnitSelector(unitName) {
  const sel = document.getElementById("item-base-unit-select");
  const customInput = document.getElementById("item-base-unit-custom");
  const hidden = document.getElementById("item-base-unit");

  hidden.value = unitName || "";

  if (!unitName) {
    sel.value = "";
    customInput.style.display = "none";
    _applyUnitToForm("");
    return;
  }

  const knownUnit = db.units.find((u) => u.name === unitName);
  if (knownUnit) {
    sel.value = unitName;
    customInput.style.display = "none";
  } else {
    sel.value = "__custom__";
    customInput.style.display = "block";
    customInput.value = unitName;
  }
  _applyUnitToForm(unitName);
}

function _applyUnitToForm(unit) {
  const u = unit || "";
  const helper = document.getElementById("item-base-unit-helper");
  if (helper)
    helper.textContent = u
      ? `Enter prices for 1 ${u}. Stock is counted in ${u}.`
      : "";

  const setSuffix = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setSuffix("suffix-buy", u ? `for 1 ${u}` : "");
  setSuffix("suffix-sell", u ? `for 1 ${u}` : "");
  setSuffix("suffix-stock", u);
  setSuffix("suffix-low", u);

  const setBuyLabel = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ? `(per 1 ${text})` : "";
  };
  const setStockLabel = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ? `(in ${text})` : "";
  };
  setBuyLabel("label-unit-buy", u);
  setBuyLabel("label-unit-sell", u);
  setStockLabel("label-unit-stock", u);
  setStockLabel("label-unit-low", u);
}

// ─── Add / Edit item modal ────────────────────────────────────────────────────

function openAddItemModal() {
  editingProductId = null;
  document.getElementById("item-modal-title").textContent = "Add New Item";
  document.getElementById("item-name").value = "";
  populateCategorySelect("item-category", null);
  setBaseUnitSelector("");
  document.getElementById("item-buy-price").value = "";
  document.getElementById("item-sell-price").value = "";
  document.getElementById("item-stock").value = "0";
  document.getElementById("item-low-stock").value = "";
  itemModalVariants = [];
  renderItemVariants();
  switchTab("basic");
  openModal("modal-add-item");
}

function editItem(productId) {
  const product = db.products.find((p) => p.id === productId && !p.is_deleted);
  if (!product) return;
  editingProductId = productId;

  document.getElementById("item-modal-title").textContent = "Edit Item";
  document.getElementById("item-name").value = product.name;
  populateCategorySelect("item-category", product.category_id);

  const baseUnitName = getProductBaseUnitName(product);
  setBaseUnitSelector(baseUnitName);

  // Get base unit row for prices
  const baseUnit = db.product_units.find(
    (u) => u.product_id === productId && u.display_name === baseUnitName,
  );
  const basePriceRow = baseUnit ? getActiveUnitPrice(baseUnit.id) : null;
  document.getElementById("item-buy-price").value = basePriceRow
    ? basePriceRow.purchase_price
    : "";
  document.getElementById("item-sell-price").value = basePriceRow
    ? basePriceRow.selling_price
    : "";

  const stockRow = getProductStock(productId);
  document.getElementById("item-stock").value = stockRow
    ? stockRow.quantity
    : 0;
  document.getElementById("item-low-stock").value =
    product.low_stock_threshold || "";

  // Load variant units (non-base-unit product_units)
  itemModalVariants = db.product_units
    .filter(
      (u) => u.product_id === productId && u.display_name !== baseUnitName,
    )
    .map((u) => {
      const priceRow = getActiveUnitPrice(u.id);
      return {
        ...u,
        purchase_price: priceRow ? priceRow.purchase_price : "",
        selling_price: priceRow ? priceRow.selling_price : "",
      };
    });
  renderItemVariants();

  switchTab("basic");
  openModal("modal-add-item");
}

function renderItemVariants() {
  const baseUnit = document.getElementById("item-base-unit").value || "unit";
  const el = document.getElementById("unit-variants-list");
  el.innerHTML =
    itemModalVariants
      .map(
        (v, i) => `
    <div style="background:var(--surface2);border-radius:var(--radius);padding:14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:13px;">Size ${i + 1}</strong>
        <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);" onclick="removeVariant(${i})">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin:0;">
          <label>Size name</label>
          <input type="text" value="${v.display_name || ""}" placeholder="e.g. sack, tray, 250mL" onchange="updateVariant(${i},'display_name',this.value)">
        </div>
        <div class="form-group" style="margin:0;">
          <label>Contains how many ${baseUnit}?</label>
          <input type="number" value="${v.pack_quantity || ""}" placeholder="e.g. 50" step="any" onchange="updateVariant(${i},'pack_quantity',parseFloat(this.value))">
        </div>
      </div>
      <div class="form-row" style="margin-top:8px;">
        <div class="form-group" style="margin:0;">
          <label>Cost price for this size</label>
          <input type="number" value="${v.purchase_price || ""}" placeholder="0.00" step="0.01" onchange="updateVariant(${i},'purchase_price',parseFloat(this.value))">
        </div>
        <div class="form-group" style="margin:0;">
          <label>Selling price for this size</label>
          <input type="number" value="${v.selling_price || ""}" placeholder="0.00" step="0.01" onchange="updateVariant(${i},'selling_price',parseFloat(this.value))">
        </div>
      </div>
      <div class="form-row" style="margin-top:8px;">
        <div class="form-group" style="margin:0;">
          <label>Can sell <input type="checkbox" ${v.can_sell !== false ? "checked" : ""} onchange="updateVariant(${i},'can_sell',this.checked)" style="width:auto;margin-left:6px;"></label>
        </div>
        <div class="form-group" style="margin:0;">
          <label>Can restock <input type="checkbox" ${v.can_restock !== false ? "checked" : ""} onchange="updateVariant(${i},'can_restock',this.checked)" style="width:auto;margin-left:6px;"></label>
        </div>
      </div>
    </div>
  `,
      )
      .join("") +
    (itemModalVariants.length
      ? ""
      : '<p class="helper" style="margin-bottom:12px;">No sizes added yet. Most items don\'t need this.</p>');
}

function addUnitVariant() {
  itemModalVariants.push({
    id: null, // will be newId on save
    product_id: editingProductId,
    unit_id: null,
    display_name: "",
    pack_quantity: "",
    purchase_price: "",
    selling_price: "",
    is_default_selling: false,
    can_restock: true,
    can_sell: true,
    approx_base_qty_per_piece: null,
    notes: "",
  });
  renderItemVariants();
}

function updateVariant(i, key, val) {
  itemModalVariants[i][key] = val;
}

function removeVariant(i) {
  itemModalVariants.splice(i, 1);
  renderItemVariants();
}

function saveItem() {
  const name = document.getElementById("item-name").value.trim();
  const catId = parseInt(document.getElementById("item-category").value);
  const baseUnitName = document.getElementById("item-base-unit").value.trim();
  const bp = parseFloat(document.getElementById("item-buy-price").value) || 0;
  const sp = parseFloat(document.getElementById("item-sell-price").value) || 0;
  const stock = parseFloat(document.getElementById("item-stock").value) || 0;
  const lowStock =
    parseFloat(document.getElementById("item-low-stock").value) || 0;
  const userId = currentUser ? currentUser.id : null;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  if (!name || !catId || !baseUnitName) {
    toast("Fill in required fields (name, category, base unit)", "error");
    return;
  }

  // Ensure unit exists in units table
  let unitRow = db.units.find((u) => u.name === baseUnitName);
  if (!unitRow) {
    unitRow = { id: newId("units"), name: baseUnitName, created_at: now };
    db.units.push(unitRow);
  }

  const catRow = db.categories.find((c) => c.id === catId);
  const emoji = catRow ? catRow.emoji || "📦" : "📦";

  if (editingProductId) {
    // Capture old base unit name BEFORE updating product fields to find the existing unit row
    const product = db.products.find((p) => p.id === editingProductId);
    const oldBaseUnitName = getProductBaseUnitName(product);

    Object.assign(product, {
      name,
      category_id: catId,
      base_unit_id: unitRow.id,
      emoji,
      low_stock_threshold: lowStock,
      updated_at: now,
    });

    // Update or create base product_unit using the captured old name
    let baseUnit = db.product_units.find(
      (u) =>
        u.product_id === editingProductId && u.display_name === oldBaseUnitName,
    );
    if (!baseUnit) {
      baseUnit = {
        id: newId("product_units"),
        product_id: editingProductId,
        unit_id: unitRow.id,
        display_name: baseUnitName,
        pack_quantity: 1,
        is_default_selling: false,
        can_restock: true,
        can_sell: true,
        approx_base_qty_per_piece: null,
        notes: null,
        created_at: now,
        updated_at: now,
      };
      db.product_units.push(baseUnit);
    } else {
      baseUnit.unit_id = unitRow.id;
      baseUnit.display_name = baseUnitName;
      baseUnit.updated_at = now;
    }
    _upsertPriceRow(baseUnit.id, bp, sp, today, userId, now);

    // Preserve existing variant units by display_name; only delete unmatched ones
    const incomingNames = new Set(
      itemModalVariants.map((v) => v.display_name).filter(Boolean),
    );
    db.product_units = db.product_units.filter(
      (u) =>
        !(
          u.product_id === editingProductId &&
          u.display_name !== baseUnitName &&
          !incomingNames.has(u.display_name)
        ),
    );

    itemModalVariants.forEach((v) => {
      if (!v.display_name) return;
      const varUnitRow = _ensureUnit(v.display_name, now);
      // Reuse existing product_unit row when possible to preserve FK references in pricing_tiers
      let existingPU = db.product_units.find(
        (u) =>
          u.product_id === editingProductId &&
          u.display_name === v.display_name,
      );
      if (existingPU) {
        existingPU.unit_id = varUnitRow.id;
        existingPU.pack_quantity = v.pack_quantity || 1;
        existingPU.can_restock = v.can_restock !== false;
        existingPU.can_sell = v.can_sell !== false;
        existingPU.updated_at = now;
        _upsertPriceRow(
          existingPU.id,
          v.purchase_price || 0,
          v.selling_price || 0,
          today,
          userId,
          now,
        );
      } else {
        const newPU = {
          id: newId("product_units"),
          product_id: editingProductId,
          unit_id: varUnitRow.id,
          display_name: v.display_name,
          pack_quantity: v.pack_quantity || 1,
          is_default_selling: false,
          can_restock: v.can_restock !== false,
          can_sell: v.can_sell !== false,
          approx_base_qty_per_piece: null,
          notes: v.notes || null,
          created_at: now,
          updated_at: now,
        };
        db.product_units.push(newPU);
        _upsertPriceRow(
          newPU.id,
          v.purchase_price || 0,
          v.selling_price || 0,
          today,
          userId,
          now,
        );
      }
    });

    // Update stock (Adjustment movement if changed)
    const stockRow = getProductStock(editingProductId);
    if (stockRow && stockRow.quantity !== stock) {
      const diff = stock - stockRow.quantity;
      const adjReasonId =
        db.stock_log_reasons.find((r) => r.name === "Adjustment")?.id || 7;
      recordStockMovement({
        product_id: editingProductId,
        stock_log_reason_id: adjReasonId,
        quantity_changed: diff,
        reference_type: "ADJUSTMENT",
        reference_id: null,
        notes: "Manual inventory edit",
      });
    } else if (!stockRow) {
      db.product_stock.push({
        product_id: editingProductId,
        quantity: stock,
        updated_at: now,
        updated_by: userId,
      });
    }

    toast("Item updated!", "success");
  } else {
    // Create new product
    const productId = newId("products");
    db.products.push({
      id: productId,
      name,
      category_id: catId,
      base_unit_id: unitRow.id,
      description: null,
      emoji,
      low_stock_threshold: lowStock,
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    // Base product_unit
    const baseUnitId = newId("product_units");
    db.product_units.push({
      id: baseUnitId,
      product_id: productId,
      unit_id: unitRow.id,
      display_name: baseUnitName,
      pack_quantity: 1,
      is_default_selling: itemModalVariants.length === 0,
      can_restock: true,
      can_sell: true,
      approx_base_qty_per_piece: null,
      notes: null,
      created_at: now,
      updated_at: now,
    });
    _upsertPriceRow(baseUnitId, bp, sp, today, userId, now);

    // Variant units
    itemModalVariants.forEach((v, idx) => {
      if (!v.display_name) return;
      const varUnitRow = _ensureUnit(v.display_name, now);
      const puId = newId("product_units");
      db.product_units.push({
        id: puId,
        product_id: productId,
        unit_id: varUnitRow.id,
        display_name: v.display_name,
        pack_quantity: v.pack_quantity || 1,
        is_default_selling: idx === 0 && itemModalVariants.length > 0,
        can_restock: v.can_restock !== false,
        can_sell: v.can_sell !== false,
        approx_base_qty_per_piece: null,
        notes: v.notes || null,
        created_at: now,
        updated_at: now,
      });
      _upsertPriceRow(
        puId,
        v.purchase_price || 0,
        v.selling_price || 0,
        today,
        userId,
        now,
      );
    });

    // Initial stock
    db.product_stock.push({
      product_id: productId,
      quantity: stock,
      updated_at: now,
      updated_by: userId,
    });
    if (stock > 0) {
      const purchaseReasonId =
        db.stock_log_reasons.find((r) => r.name === "Purchase")?.id || 1;
      db.stock_movements.push({
        id: newId("stock_movements"),
        product_id: productId,
        stock_log_reason_id: purchaseReasonId,
        quantity_changed: stock,
        reference_type: null,
        reference_id: null,
        notes: "Initial stock on item creation",
        created_by: userId,
        created_at: now,
      });
    }

    toast("Item added!", "success");
  }

  closeModal("modal-add-item");
  persistDb();
  renderInventory();
  renderPOSItems();
  updateLowStockAlerts();
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _ensureUnit(unitName, now) {
  let u = db.units.find((x) => x.name === unitName);
  if (!u) {
    u = { id: newId("units"), name: unitName, created_at: now };
    db.units.push(u);
  }
  return u;
}

// _upsertPriceRow: Expires active price row then inserts a new one.
function _upsertPriceRow(
  productUnitId,
  purchasePrice,
  sellingPrice,
  today,
  userId,
  now,
) {
  // Expire old active rows using yesterday so today's new row is unambiguously active
  const yesterday = new Date(new Date(today) - 86400000)
    .toISOString()
    .split("T")[0];
  db.product_unit_prices.forEach((p) => {
    if (p.product_unit_id === productUnitId && p.expiry_date === null) {
      p.expiry_date = yesterday;
      p.updated_at = now;
      p.updated_by = userId;
    }
  });
  db.product_unit_prices.push({
    id: newId("product_unit_prices"),
    product_unit_id: productUnitId,
    purchase_price: purchasePrice,
    selling_price: sellingPrice,
    effective_date: today,
    expiry_date: null,
    created_by: userId,
    updated_by: null,
    created_at: now,
    updated_at: now,
  });
}
