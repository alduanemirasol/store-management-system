// Controller: Manages POS business logic and user interactions.
const Logic = (() => {
  let _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };
  let _currentSellItem = null;
  let _currentCategory = "all";
  let _posSearch = "";
  let _inventorySearch = "";
  let _restockUnitType = "base";
  let _restockUnitId = null;
  // UI: Updates item grid with filtered items.
  function _refreshItemGrid() {
    const items = ItemService.list(_currentCategory, _posSearch);
    renderItemGrid(items);
  }
  // Event: Handles category filter selection.
  function onCategoryFilter(cat, el) {
    _currentCategory = cat;
    document
      .querySelectorAll(".tag[data-cat]")
      .forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
    _refreshItemGrid();
  }
  // Event: Handles POS search input.
  function onPosSearch(val) {
    _posSearch = val;
    _refreshItemGrid();
  }
  // Event: Opens sale modal for selected item.
  function onItemCardClick(itemId) {
    const item = getItem(itemId);
    _currentSellItem = item;
    _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };
    const units = getUnits(item.id);
    const activePricing = getActivePricing(item.id);
    renderSellModalBody(item, units, activePricing, _sellSelection);
    _refreshSellPreview();
    openModal("sell-modal");
  }
  // Event: Handles sale type selection (base/unit/pricing).
  function onSellTypeSelect(type, unitId, pricingId, el) {
    _sellSelection.type = type;
    _sellSelection.unitId = unitId;
    _sellSelection.pricingId = pricingId;
    activateSellOption(el);
    _refreshSellPreview();
  }
  // Event: Handles quantity input change.
  function onSellQtyChange() {
    _refreshSellPreview();
  }
  // UI: Updates sale preview with calculated values.
  function _refreshSellPreview() {
    const item = _currentSellItem;
    const qty = parseFloat(document.getElementById("sell-qty")?.value) || 0;
    const overrideEl = document.getElementById("sell-override");
    const overrideVal = overrideEl ? overrideEl.value : null;
    if (!qty || qty <= 0) {
      updateSellPreview(null, false);
      return;
    }
    const result = calcSellDetails(
      item,
      _sellSelection.type,
      _sellSelection.unitId,
      _sellSelection.pricingId,
      qty,
      overrideVal,
    );
    const insufficient = result.baseUnits > item.stock_quantity;
    const stockMsg = insufficient
      ? `Insufficient stock (available: ${fmtNum(item.stock_quantity)} ${item.base_unit})`
      : "";
    updateSellPreview(result, insufficient, stockMsg);
  }
  // Event: Adds current item to cart.
  function onAddToCart() {
    const item = _currentSellItem;
    const qty = parseFloat(document.getElementById("sell-qty")?.value) || 0;
    const overrideEl = document.getElementById("sell-override");
    const override = overrideEl ? overrideEl.value : null;
    const result = CartService.addItem(
      item,
      _sellSelection.type,
      _sellSelection.unitId,
      _sellSelection.pricingId,
      qty,
      override,
    );
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    closeModal("sell-modal");
    _refreshCart();
    toast(`${item.item_name} added to cart`, "success");
  }
  // UI: Renders cart with current items and total.
  function _refreshCart() {
    renderCart(CartService.getItems(), CartService.getTotal());
  }
  // Event: Removes item from cart by index.
  function onRemoveCartItem(index) {
    CartService.removeItem(index);
    _refreshCart();
  }
  // Event: Clears all items from cart.
  function onClearCart() {
    CartService.clear();
    _refreshCart();
  }
  // Event: Updates change display when tendered amount changes.
  function onTenderedChange() {
    renderChangeDisplay(CartService.getTotal());
  }
  // Event: Processes checkout and completes sale.
  function onCheckout() {
    const tendered = parseFloat(document.getElementById("tendered").value) || 0;
    const result = CartService.checkout(tendered);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    document.getElementById("tendered").value = "";
    _refreshCart();
    _refreshItemGrid();
    showReceipt(result.transaction);
  }
  // UI: Renders inventory table with items.
  function _refreshInventoryTable() {
    const items = ItemService.list("all", _inventorySearch);
    renderInventoryTable(items);
  }
  // Event: Handles inventory search input.
  function onInventorySearch(val) {
    _inventorySearch = val;
    _refreshInventoryTable();
  }
  // Event: Opens modal to add new item.
  function onAddItem() {
    populateItemForm(null, []);
    openModal("add-item-modal");
  }
  // Event: Opens modal to edit existing item.
  function onEditItem(id) {
    const item = getItem(id);
    const units = getUnits(id);
    populateItemForm(item, units);
    openModal("add-item-modal");
  }
  // Event: Saves item (create or update) from form.
  function onSaveItem() {
    const form = readItemForm();
    if (!form.item_name || !form.base_unit) {
      toast("Name and base unit are required", "error");
      return;
    }
    if (form.id) {
      ItemService.update(parseInt(form.id), {
        item_name: form.item_name,
        category: form.category,
        base_unit: form.base_unit,
        stock_quantity: form.stock_quantity,
        purchase_price_per_unit: form.purchase_price_per_unit,
        selling_price_per_unit: form.selling_price_per_unit,
        allow_override: form.allow_override,
      });
      ItemService.replaceUnits(parseInt(form.id), form.units);
      toast("Item updated", "success");
    } else {
      const item = ItemService.create({
        item_name: form.item_name,
        category: form.category,
        base_unit: form.base_unit,
        stock_quantity: form.stock_quantity,
        purchase_price_per_unit: form.purchase_price_per_unit,
        selling_price_per_unit: form.selling_price_per_unit,
        allow_override: form.allow_override,
      });
      ItemService.replaceUnits(item.id, form.units);
      toast("Item added", "success");
    }
    closeModal("add-item-modal");
    _refreshInventoryTable();
    _refreshItemGrid();
  }
  // Event: Deletes item after confirmation.
  function onDeleteItem(id) {
    if (!confirm("Delete this item?")) return;
    ItemService.remove(id);
    _refreshInventoryTable();
    _refreshItemGrid();
    toast("Item deleted");
  }
  // Init: Sets up restock UI with item list.
  function initRestockUI() {
    _restockUnitType = "base";
    _restockUnitId = null;
    populateRestockItemSelect(ItemService.list());
    renderRestockHistoryTable(RestockService.getHistory());
  }
  // Event: Handles restock item selection change.
  function onRestockItemChange() {
    const id = parseInt(document.getElementById("restock-item").value);
    if (!id) {
      document.getElementById("restock-unit-section").style.display = "none";
      return;
    }
    _restockUnitType = "base";
    _restockUnitId = null;
    const item = getItem(id);
    const units = getUnits(id);
    renderRestockUnits(item, units);
    _refreshRestockPreview();
  }
  // Event: Handles restock unit type selection.
  function onRestockUnitSelect(type, unitId, el) {
    _restockUnitType = type;
    _restockUnitId = unitId;
    activateRestockOption(el);
    _refreshRestockPreview();
  }
  // Event: Handles restock quantity input change.
  function onRestockQtyChange() {
    _refreshRestockPreview();
  }
  // UI: Updates restock preview with calculated values.
  function _refreshRestockPreview() {
    const qty = parseFloat(document.getElementById("restock-qty")?.value) || 0;
    const itemId = parseInt(document.getElementById("restock-item").value);
    const item = getItem(itemId);
    if (!item || qty <= 0) {
      updateRestockPreview(null);
      return;
    }
    const { baseUnits, cost, label } = calcRestockDetails(
      item,
      _restockUnitType,
      _restockUnitId,
      qty,
    );
    updateRestockPreview({
      label,
      cost,
      newStock: item.stock_quantity + baseUnits,
      baseUnit: item.base_unit,
    });
  }
  // Event: Executes restock and updates stock.
  function onDoRestock() {
    const qty = parseFloat(document.getElementById("restock-qty").value);
    const itemId = parseInt(document.getElementById("restock-item").value);
    const result = RestockService.restock(
      itemId,
      _restockUnitType,
      _restockUnitId,
      qty,
    );
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    document.getElementById("restock-qty").value = "";
    updateRestockPreview(null);
    renderRestockHistoryTable(RestockService.getHistory());
    _refreshItemGrid();
    toast(
      `Restocked ${result.item.item_name} +${fmtNum(result.baseUnits)} ${result.item.base_unit}`,
      "success",
    );
  }
  // Event: Opens modal to add pricing rule.
  function onOpenAddPricing() {
    populatePricingItemSelect(ItemService.list());
    resetPricingForm();
    openModal("add-pricing-modal");
  }
  // Event: Saves new pricing rule from form.
  function onSavePricing() {
    const form = readPricingForm();
    const result = PricingService.create(form);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    closeModal("add-pricing-modal");
    renderPricingTable(PricingService.list());
    toast("Price rule added", "success");
  }
  // Event: Toggles pricing rule active status.
  function onTogglePricing(id) {
    PricingService.toggle(id);
    renderPricingTable(PricingService.list());
  }
  // Event: Deletes pricing rule after confirmation.
  function onDeletePricing(id) {
    PricingService.remove(id);
    renderPricingTable(PricingService.list());
    toast("Price rule deleted");
  }
  // UI: Renders dashboard with stats and recent data.
  function onShowDashboard() {
    renderDashboard(
      DashboardService.getStats(),
      DashboardService.getRecentTransactions(),
      DashboardService.getInventoryStatus(),
    );
  }
  // Init: Starts application and loads initial data.
  function init() {
    seedDatabase();
    _attachGlobalListeners();
    _refreshItemGrid();
  }
  // Init: Attaches global event listeners.
  function _attachGlobalListeners() {
    document.addEventListener("input", (e) => {
      if (e.target.id === "restock-qty") onRestockQtyChange();
      if (e.target.id === "tendered") onTenderedChange();
    });
  }
  return {
    init,
    showPage: (pageId, event) => {
      showPage(pageId, event);
      if (pageId === "dashboard") onShowDashboard();
      if (pageId === "inventory")
        renderInventoryTable(ItemService.list("all", _inventorySearch));
      if (pageId === "pricing") renderPricingTable(PricingService.list());
      if (pageId === "restock") initRestockUI();
    },
    onCategoryFilter,
    onPosSearch,
    onItemCardClick,
    onSellTypeSelect,
    onSellQtyChange,
    onAddToCart,
    onRemoveCartItem,
    onClearCart,
    onTenderedChange,
    onCheckout,
    onInventorySearch,
    onAddItem,
    onEditItem,
    onSaveItem,
    onDeleteItem,
    addUnitVariantRow,
    initRestockUI,
    onRestockItemChange,
    onRestockUnitSelect,
    onDoRestock,
    onOpenAddPricing,
    onSavePricing,
    onTogglePricing,
    onDeletePricing,
    closeModal,
    openModal,
  };
})();
