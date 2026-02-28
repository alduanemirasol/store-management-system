let editingItemId = null;
let itemModalVariants = [];

const KNOWN_BASE_UNITS = [
  "kg",
  "g",
  "lb",
  "oz",
  "mL",
  "L",
  "fl oz",
  "cup",
  "piece",
  "pack",
  "box",
  "bottle",
  "bag",
  "can",
  "sachet",
  "roll",
  "pair",
  "set",
  "m",
  "cm",
];

function renderInventory() {
  const q = document.getElementById("inv-search").value.toLowerCase();
  const catEl = document.getElementById("inv-cat-filter");
  const cat = catEl.value;

  const cur = catEl.value;
  catEl.innerHTML =
    '<option value="">All Categories</option>' +
    db.categories
      .map(
        (c) =>
          `<option value="${c.name}" ${c.name === cur ? "selected" : ""}>${c.emoji || ""} ${c.name}</option>`,
      )
      .join("");

  let items = db.items;
  if (cat) items = items.filter((i) => i.category === cat);
  if (q)
    items = items.filter(
      (i) =>
        i.item_name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );

  const tbody = document.getElementById("inv-tbody");
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="page-empty">No items found.</td></tr>`;
    updateInventoryLowStockPanel(getLowStockItems());
    return;
  }

  tbody.innerHTML = items
    .map((item) => {
      const low =
        item.low_stock_threshold &&
        item.stock_quantity <= item.low_stock_threshold;
      const out = item.stock_quantity <= 0;
      const units = db.item_units.filter((u) => u.item_id === item.id);
      const catObj = db.categories.find((c) => c.name === item.category);
      const catEmoji = catObj ? catObj.emoji : "";
      const catColor = catObj ? catObj.color : "blue";
      const stockColor = out
        ? "color:var(--red)"
        : low
          ? "color:var(--orange)"
          : "";

      return `<tr>
        <td><strong>${item.emoji || "📦"} ${item.item_name}</strong></td>
        <td><span class="badge badge-${catColor}">${catEmoji} ${item.category}</span></td>
        <td><span style="color:var(--text3);">${item.base_unit}</span></td>
        <td>
          <strong ${stockColor ? `style="${stockColor}"` : ""}>${formatStock(item)} ${item.base_unit}</strong>
          ${units.length ? `<br><span style="font-size:11px;color:var(--text3);">${units.map((u) => `1 ${u.unit_name} = ${u.pack_quantity} ${item.base_unit}`).join(", ")}</span>` : ""}
          ${out ? '<br><span class="badge badge-red">Out of Stock</span>' : low ? '<br><span class="badge badge-orange">Low Stock</span>' : ""}
        </td>
        <td>₱${item.purchase_price_per_unit.toFixed(2)}<span style="color:var(--text3);font-size:12px;">/${item.base_unit}</span></td>
        <td>₱${item.selling_price_per_unit.toFixed(2)}<span style="color:var(--text3);font-size:12px;">/${item.base_unit}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="editItem(${item.id})">Edit</button>
            <button class="btn btn-sm" style="background:var(--green-light);color:var(--green);" onclick="quickRestock(${item.id})">Restock</button>
            <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);" onclick="confirmDeleteItem(${item.id})">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  updateInventoryLowStockPanel(getLowStockItems());
}

function quickRestock(itemId) {
  showPage("restock");
  setTimeout(() => {
    document.getElementById("restock-item").value = itemId;
    updateRestockOptions();
  }, 100);
}

function onBaseUnitSelectChange() {
  const sel = document.getElementById("item-base-unit-select");
  const customInput = document.getElementById("item-base-unit-custom");
  const hidden = document.getElementById("item-base-unit");
  const helper = document.getElementById("item-base-unit-helper");

  if (sel.value === "__custom__") {
    customInput.style.display = "block";
    customInput.focus();
    hidden.value = customInput.value.trim();
    helper.textContent = "Enter your custom unit name below";
  } else {
    customInput.style.display = "none";
    hidden.value = sel.value;
    helper.textContent = sel.value
      ? `Stock and prices are tracked per ${sel.value}`
      : "Smallest standard unit";
  }
  updateDefaultUnitSelect(hidden.value);
}

function onBaseUnitCustomInput() {
  const val = document.getElementById("item-base-unit-custom").value.trim();
  document.getElementById("item-base-unit").value = val;
  document.getElementById("item-base-unit-helper").textContent = val
    ? `Stock and prices are tracked per ${val}`
    : "Type your unit name above";
  updateDefaultUnitSelect(val);
}

function setBaseUnitSelector(unitValue) {
  const sel = document.getElementById("item-base-unit-select");
  const customInput = document.getElementById("item-base-unit-custom");
  const hidden = document.getElementById("item-base-unit");
  const helper = document.getElementById("item-base-unit-helper");

  hidden.value = unitValue || "";

  if (!unitValue) {
    sel.value = "";
    customInput.style.display = "none";
    helper.textContent = "Smallest standard unit";
    return;
  }

  const isKnown = KNOWN_BASE_UNITS.includes(unitValue);
  if (isKnown) {
    sel.value = unitValue;
    customInput.style.display = "none";
    helper.textContent = `Stock and prices are tracked per ${unitValue}`;
  } else {
    sel.value = "__custom__";
    customInput.style.display = "block";
    customInput.value = unitValue;
    helper.textContent = `Stock and prices are tracked per ${unitValue}`;
  }
}

function openAddItemModal() {
  editingItemId = null;
  document.getElementById("item-modal-title").textContent = "Add New Item";
  document.getElementById("item-name").value = "";
  populateCategorySelect("item-category", "");
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

function editItem(itemId) {
  const item = db.items.find((i) => i.id === itemId);
  if (!item) return;
  editingItemId = itemId;
  document.getElementById("item-modal-title").textContent = "Edit Item";
  document.getElementById("item-name").value = item.item_name;
  populateCategorySelect("item-category", item.category);
  setBaseUnitSelector(item.base_unit);
  document.getElementById("item-buy-price").value =
    item.purchase_price_per_unit;
  document.getElementById("item-sell-price").value =
    item.selling_price_per_unit;
  document.getElementById("item-stock").value = item.stock_quantity;
  document.getElementById("item-low-stock").value =
    item.low_stock_threshold || "";

  itemModalVariants = db.item_units
    .filter((u) => u.item_id === itemId)
    .map((u) => ({ ...u }));
  renderItemVariants();

  updateDefaultUnitSelect(item.base_unit);
  document.getElementById("item-default-unit").value =
    item.default_selling_unit || "base";

  switchTab("basic");
  openModal("modal-add-item");
}

function updateDefaultUnitSelect(baseUnit) {
  const sel = document.getElementById("item-default-unit");
  let opts = `<option value="base">${baseUnit || "base unit"}</option>`;
  itemModalVariants.forEach((v) => {
    opts += `<option value="unit-${v.id}">${v.unit_name}</option>`;
  });
  sel.innerHTML = opts;
}

function addUnitVariant() {
  itemModalVariants.push({
    id: "new-" + Date.now(),
    item_id: editingItemId,
    unit_name: "",
    pack_quantity: "",
    purchase_price: "",
    selling_price: "",
    note: "",
  });
  renderItemVariants();
}

function renderItemVariants() {
  const el = document.getElementById("unit-variants-list");
  el.innerHTML =
    itemModalVariants
      .map(
        (v, i) => `
    <div style="background:var(--surface2);border-radius:var(--radius);padding:14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:13px;">Unit ${i + 1}</strong>
        <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);" onclick="removeVariant(${i})">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin:0;">
          <label>Unit Name</label>
          <input type="text" value="${v.unit_name}" placeholder="e.g. sack, tray" onchange="updateVariant(${i},'unit_name',this.value)">
        </div>
        <div class="form-group" style="margin:0;">
          <label>Qty (in base units)</label>
          <input type="number" value="${v.pack_quantity}" placeholder="e.g. 50" step="any" onchange="updateVariant(${i},'pack_quantity',parseFloat(this.value))">
        </div>
      </div>
      <div class="form-row" style="margin-top:8px;">
        <div class="form-group" style="margin:0;">
          <label>Purchase Price</label>
          <input type="number" value="${v.purchase_price}" placeholder="0.00" step="0.01" onchange="updateVariant(${i},'purchase_price',parseFloat(this.value))">
        </div>
        <div class="form-group" style="margin:0;">
          <label>Selling Price</label>
          <input type="number" value="${v.selling_price}" placeholder="0.00" step="0.01" onchange="updateVariant(${i},'selling_price',parseFloat(this.value))">
        </div>
      </div>
      <div class="form-group" style="margin-top:8px;margin-bottom:0;">
        <label>Note <span style="font-weight:400;color:var(--text3);">(optional)</span></label>
        <input type="text" value="${v.note}" placeholder="Optional note" onchange="updateVariant(${i},'note',this.value)">
      </div>
    </div>`,
      )
      .join("") +
    (itemModalVariants.length
      ? ""
      : '<p class="helper">No unit variants yet.</p>');
  updateDefaultUnitSelect(document.getElementById("item-base-unit").value);
}

function updateVariant(i, key, val) {
  itemModalVariants[i][key] = val;
  updateDefaultUnitSelect(document.getElementById("item-base-unit").value);
}

function removeVariant(i) {
  itemModalVariants.splice(i, 1);
  renderItemVariants();
}

function saveItem() {
  const name = document.getElementById("item-name").value.trim();
  const cat = document.getElementById("item-category").value.trim();
  const bu = document.getElementById("item-base-unit").value.trim();
  const bp = parseFloat(document.getElementById("item-buy-price").value) || 0;
  const sp = parseFloat(document.getElementById("item-sell-price").value) || 0;
  const stock = parseFloat(document.getElementById("item-stock").value) || 0;
  const lowStock =
    parseFloat(document.getElementById("item-low-stock").value) || 0;
  const defUnit = document.getElementById("item-default-unit").value;

  if (!name || !cat || !bu) {
    toast("Fill in required fields (name, category, base unit)", "error");
    return;
  }

  const catObj = db.categories.find((c) => c.name === cat);
  const emoji = catObj ? catObj.emoji : "📦";

  if (editingItemId) {
    const item = db.items.find((i) => i.id === editingItemId);
    Object.assign(item, {
      item_name: name,
      category: cat,
      base_unit: bu,
      purchase_price_per_unit: bp,
      selling_price_per_unit: sp,
      stock_quantity: stock,
      low_stock_threshold: lowStock,
      default_selling_unit: defUnit,
      emoji,
    });
    db.item_units = db.item_units.filter((u) => u.item_id !== editingItemId);
    itemModalVariants.forEach((v) => {
      const id =
        typeof v.id === "string" && v.id.startsWith("new-")
          ? newId("item_units")
          : v.id;
      if (v.unit_name) db.item_units.push({ ...v, id, item_id: editingItemId });
    });
    toast("Item updated!", "success");
  } else {
    const id = newId("items");
    db.items.push({
      id,
      item_name: name,
      category: cat,
      base_unit: bu,
      purchase_price_per_unit: bp,
      selling_price_per_unit: sp,
      stock_quantity: stock,
      low_stock_threshold: lowStock,
      default_selling_unit: defUnit || "base",
      emoji,
    });
    itemModalVariants.forEach((v) => {
      if (v.unit_name)
        db.item_units.push({ ...v, id: newId("item_units"), item_id: id });
    });
    toast("Item added!", "success");
  }

  closeModal("modal-add-item");
  persistDb();
  renderInventory();
  updateLowStockAlerts();
}

function confirmDeleteItem(itemId) {
  const item = db.items.find((i) => i.id === itemId);
  if (!item) return;

  document.getElementById("delete-item-name").textContent =
    `${item.emoji || "📦"} ${item.item_name}`;
  document.getElementById("delete-item-confirm-btn").onclick = () =>
    deleteItem(itemId);
  openModal("modal-delete-item");
}

function deleteItem(itemId) {
  const item = db.items.find((i) => i.id === itemId);
  if (!item) return;

  db.items = db.items.filter((i) => i.id !== itemId);
  db.item_units = db.item_units.filter((u) => u.item_id !== itemId);
  db.custom_pricing = db.custom_pricing.filter((cp) => cp.item_id !== itemId);

  closeModal("modal-delete-item");
  persistDb();
  renderInventory();
  updateLowStockAlerts();
  renderPOSItems();
  toast(`"${item.item_name}" deleted`, "info");
}
