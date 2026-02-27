const Logic = (() => {
  let _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };
  let _currentSellItem = null;
  let _currentCategory = "all";
  let _posSearch = "";
  let _inventorySearch = "";
  let _restockUnitType = "base";
  let _restockUnitId = null;

  function _refreshItemGrid() {
    renderItemGrid(ItemService.list(_currentCategory, _posSearch));
  }

  function _refreshCart() {
    renderCart(CartService.getItems(), CartService.getTotal());
  }

  function _refreshInventoryTable() {
    renderInventoryTable(ItemService.list("all", _inventorySearch));
  }

  function _refreshSellPreview() {
    const item = _currentSellItem;
    const qty = parseFloat(document.getElementById("sell-qty")?.value) || 0;
    const overrideEl = document.getElementById("sell-override");
    const overrideVal = overrideEl ? overrideEl.value : null;

    if (!qty || qty <= 0) {
      updateSellPreview(null, false);
      return;
    }

    const result = calcSellDetails(item, _sellSelection.type, _sellSelection.unitId, _sellSelection.pricingId, qty, overrideVal);
    const insufficient = result.baseUnits > item.stock_quantity;
    const stockMsg = insufficient
      ? `Insufficient stock (available: ${fmtNum(item.stock_quantity)} ${item.base_unit})`
      : "";

    updateSellPreview(result, insufficient, stockMsg);
  }

  function _refreshRestockPreview() {
    const qty = parseFloat(document.getElementById("restock-qty")?.value) || 0;
    const itemId = parseInt(document.getElementById("restock-item").value);
    const item = getItem(itemId);

    if (!item || qty <= 0) {
      updateRestockPreview(null);
      return;
    }

    const { baseUnits, cost, label } = calcRestockDetails(item, _restockUnitType, _restockUnitId, qty);
    updateRestockPreview({ label, cost, newStock: item.stock_quantity + baseUnits, baseUnit: item.base_unit });
  }

  function onCategoryFilter(cat, el) {
    _currentCategory = cat;
    document.querySelectorAll(".tag[data-cat]").forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
    _refreshItemGrid();
  }

  function onPosSearch(val) {
    _posSearch = val;
    _refreshItemGrid();
  }

  function onItemCardClick(itemId) {
    _currentSellItem = getItem(itemId);
    _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };

    const units = getUnits(_currentSellItem.id);
    const activePricing = getActivePricing(_currentSellItem.id);

    renderSellModalBody(_currentSellItem, units, activePricing, _sellSelection);
    _refreshSellPreview();
    openModal("sell-modal");
  }

  function onSellTypeSelect(type, unitId, pricingId, el) {
    _sellSelection.type = type;
    _sellSelection.unitId = unitId;
    _sellSelection.pricingId = pricingId;
    activateSellOption(el);
    _refreshSellPreview();
  }

  function onSellQtyChange() {
    _refreshSellPreview();
  }

  function onAddToCart() {
    const qty = parseFloat(document.getElementById("sell-qty")?.value) || 0;
    const overrideEl = document.getElementById("sell-override");
    const override = overrideEl ? overrideEl.value : null;

    const result = CartService.addItem(
      _currentSellItem,
      _sellSelection.type,
      _sellSelection.unitId,
      _sellSelection.pricingId,
      qty,
      override,
    );

    if (!result.ok) { toast(result.error, "error"); return; }

    closeModal("sell-modal");
    _refreshCart();
    toast(`${_currentSellItem.item_name} added to order`, "success");
  }

  function onRemoveCartItem(index) {
    CartService.removeItem(index);
    _refreshCart();
  }

  function onClearCart() {
    CartService.clear();
    _refreshCart();
  }

  function onTenderedChange() {
    renderChangeDisplay(CartService.getTotal());
  }

  function onCheckout() {
    const tendered = parseFloat(document.getElementById("tendered").value) || 0;
    const result = CartService.checkout(tendered);

    if (!result.ok) { toast(result.error, "error"); return; }

    document.getElementById("tendered").value = "";
    _refreshCart();
    _refreshItemGrid();
    showReceipt(result.transaction);
  }

  function onInventorySearch(val) {
    _inventorySearch = val;
    _refreshInventoryTable();
  }

  function onAddItem() {
    populateItemForm(null, []);
    openModal("add-item-modal");
  }

  function onEditItem(id) {
    populateItemForm(getItem(id), getUnits(id));
    openModal("add-item-modal");
  }

  function onSaveItem() {
    const form = readItemForm();
    if (!form.item_name || !form.base_unit) {
      toast("Name and base unit are required", "error");
      return;
    }

    const itemData = {
      item_name: form.item_name,
      category: form.category,
      base_unit: form.base_unit,
      stock_quantity: form.stock_quantity,
      purchase_price_per_unit: form.purchase_price_per_unit,
      selling_price_per_unit: form.selling_price_per_unit,
      allow_override: form.allow_override,
    };

    if (form.id) {
      ItemService.update(parseInt(form.id), itemData);
      ItemService.replaceUnits(parseInt(form.id), form.units);
      toast("Item updated", "success");
    } else {
      const item = ItemService.create(itemData);
      ItemService.replaceUnits(item.id, form.units);
      toast("Item added", "success");
    }

    closeModal("add-item-modal");
    _refreshInventoryTable();
    _refreshItemGrid();
  }

  function onDeleteItem(id) {
    if (!confirm("Delete this item?")) return;
    ItemService.remove(id);
    _refreshInventoryTable();
    _refreshItemGrid();
    toast("Item deleted");
  }

  function initRestockUI() {
    _restockUnitType = "base";
    _restockUnitId = null;
    populateRestockItemSelect(ItemService.list());
    renderRestockHistoryTable(RestockService.getHistory());
  }

  function onRestockItemChange() {
    const id = parseInt(document.getElementById("restock-item").value);
    if (!id) {
      document.getElementById("restock-unit-section").style.display = "none";
      return;
    }
    _restockUnitType = "base";
    _restockUnitId = null;
    renderRestockUnits(getItem(id), getUnits(id));
    _refreshRestockPreview();
  }

  function onRestockUnitSelect(type, unitId, el) {
    _restockUnitType = type;
    _restockUnitId = unitId;
    activateRestockOption(el);
    _refreshRestockPreview();
  }

  function onDoRestock() {
    const qty = parseFloat(document.getElementById("restock-qty").value);
    const itemId = parseInt(document.getElementById("restock-item").value);
    const result = RestockService.restock(itemId, _restockUnitType, _restockUnitId, qty);

    if (!result.ok) { toast(result.error, "error"); return; }

    document.getElementById("restock-qty").value = "";
    updateRestockPreview(null);
    renderRestockHistoryTable(RestockService.getHistory());
    _refreshItemGrid();
    toast(`Restocked ${result.item.item_name} +${fmtNum(result.baseUnits)} ${result.item.base_unit}`, "success");
  }

  function onOpenAddPricing() {
    populatePricingItemSelect(ItemService.list());
    resetPricingForm();
    openModal("add-pricing-modal");
  }

  function onSavePricing() {
    const result = PricingService.create(readPricingForm());
    if (!result.ok) { toast(result.error, "error"); return; }
    closeModal("add-pricing-modal");
    renderPricingTable(PricingService.list());
    toast("Price rule added", "success");
  }

  function onTogglePricing(id) {
    PricingService.toggle(id);
    renderPricingTable(PricingService.list());
  }

  function onDeletePricing(id) {
    PricingService.remove(id);
    renderPricingTable(PricingService.list());
    toast("Price rule deleted");
  }

  function onShowDashboard() {
    renderDashboard(
      DashboardService.getStats(),
      DashboardService.getRecentTransactions(),
      DashboardService.getInventoryStatus(),
    );
  }

  function init() {
    seedDatabase();
    _attachGlobalListeners();
    _refreshItemGrid();
  }

  function _attachGlobalListeners() {
    document.addEventListener("input", (e) => {
      if (e.target.id === "restock-qty") _refreshRestockPreview();
      if (e.target.id === "tendered") onTenderedChange();
    });
  }

  return {
    init,

    showPage(pageId, event) {
      showPage(pageId, event);
      if (pageId === "dashboard") onShowDashboard();
      if (pageId === "inventory") renderInventoryTable(ItemService.list("all", _inventorySearch));
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

    openModal,
    closeModal,
  };
})();
