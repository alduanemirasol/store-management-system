/**
 * logic.js
 * Application controller — wires UI events to services and drives re-renders.
 * Depends on: helpers.js, services.js, ui.js
 * Exposed as the global `Logic` object for inline HTML event handlers.
 */

const Logic = (() => {
  // ─── Private State ──────────────────────────────────────────────────────────

  let _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };
  let _currentSellItem = null;
  let _currentCategory = "all";
  let _posSearch = "";
  let _inventorySearch = "";
  let _restockUnitType = "base";
  let _restockUnitId = null;

  // ─── Private Refresh Helpers ─────────────────────────────────────────────────

  /** Re-renders the POS item grid with the current category/search filters. */
  function _refreshItemGrid() {
    renderItemGrid(ItemService.list(_currentCategory, _posSearch));
  }

  /** Re-renders the cart panel. */
  function _refreshCart() {
    renderCart(CartService.getItems(), CartService.getTotal());
  }

  /** Re-renders the inventory table with the current search filter. */
  function _refreshInventoryTable() {
    renderInventoryTable(ItemService.list("all", _inventorySearch));
  }

  /** Recomputes and displays the sell-modal preview based on current selection. */
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

  /** Recomputes and displays the restock preview. */
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

  // ─── POS Events ──────────────────────────────────────────────────────────────

  /** Switches the active category filter tag and refreshes the grid. */
  function onCategoryFilter(cat, el) {
    _currentCategory = cat;
    document.querySelectorAll(".tag[data-cat]").forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
    _refreshItemGrid();
  }

  /** Filters the POS grid by search input. */
  function onPosSearch(val) {
    _posSearch = val;
    _refreshItemGrid();
  }

  /** Opens the sell modal for the selected item with defaults. */
  function onItemCardClick(itemId) {
    _currentSellItem = getItem(itemId);
    _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };

    const units = getUnits(_currentSellItem.id);
    const activePricing = getActivePricing(_currentSellItem.id);

    renderSellModalBody(_currentSellItem, units, activePricing, _sellSelection);
    _refreshSellPreview();
    openModal("sell-modal");
  }

  /** Updates the sell selection when the user picks a sell-by option. */
  function onSellTypeSelect(type, unitId, pricingId, el) {
    _sellSelection.type = type;
    _sellSelection.unitId = unitId;
    _sellSelection.pricingId = pricingId;
    activateSellOption(el);
    _refreshSellPreview();
  }

  /** Refreshes the sell preview when the quantity input changes. */
  function onSellQtyChange() {
    _refreshSellPreview();
  }

  /** Validates and adds the current sell selection to the cart. */
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

  /** Removes a cart item by its array index and refreshes the cart. */
  function onRemoveCartItem(index) {
    CartService.removeItem(index);
    _refreshCart();
  }

  /** Clears the entire cart. */
  function onClearCart() {
    CartService.clear();
    _refreshCart();
  }

  /** Refreshes the change display when the tendered input changes. */
  function onTenderedChange() {
    renderChangeDisplay(CartService.getTotal());
  }

  /** Processes checkout: validates, records transaction, shows receipt. */
  function onCheckout() {
    const tendered = parseFloat(document.getElementById("tendered").value) || 0;
    const result = CartService.checkout(tendered);

    if (!result.ok) { toast(result.error, "error"); return; }

    document.getElementById("tendered").value = "";
    _refreshCart();
    _refreshItemGrid();
    showReceipt(result.transaction);
  }

  // ─── Inventory Events ─────────────────────────────────────────────────────────

  /** Filters the inventory table by search input. */
  function onInventorySearch(val) {
    _inventorySearch = val;
    _refreshInventoryTable();
  }

  /** Opens the add-item modal with a blank form. */
  function onAddItem() {
    populateItemForm(null, []);
    openModal("add-item-modal");
  }

  /** Opens the add-item modal pre-filled with the selected item's data. */
  function onEditItem(id) {
    populateItemForm(getItem(id), getUnits(id));
    openModal("add-item-modal");
  }

  /** Saves an item (create or update) from the modal form. */
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

  /** Confirms and deletes an item. */
  function onDeleteItem(id) {
    if (!confirm("Delete this item?")) return;
    ItemService.remove(id);
    _refreshInventoryTable();
    _refreshItemGrid();
    toast("Item deleted");
  }

  // ─── Restock Events ───────────────────────────────────────────────────────────

  /** Initialises the restock page with item list and history. */
  function initRestockUI() {
    _restockUnitType = "base";
    _restockUnitId = null;
    populateRestockItemSelect(ItemService.list());
    renderRestockHistoryTable(RestockService.getHistory());
  }

  /** Renders restock unit options when a different item is selected. */
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

  /** Updates the active restock unit selection. */
  function onRestockUnitSelect(type, unitId, el) {
    _restockUnitType = type;
    _restockUnitId = unitId;
    activateRestockOption(el);
    _refreshRestockPreview();
  }

  /** Executes the restock action and refreshes history and grid. */
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

  // ─── Pricing Events ───────────────────────────────────────────────────────────

  /** Opens the add-pricing modal with a blank form. */
  function onOpenAddPricing() {
    populatePricingItemSelect(ItemService.list());
    resetPricingForm();
    openModal("add-pricing-modal");
  }

  /** Saves a new pricing rule from the modal form. */
  function onSavePricing() {
    const result = PricingService.create(readPricingForm());
    if (!result.ok) { toast(result.error, "error"); return; }
    closeModal("add-pricing-modal");
    renderPricingTable(PricingService.list());
    toast("Price rule added", "success");
  }

  /** Toggles a pricing rule's active state. */
  function onTogglePricing(id) {
    PricingService.toggle(id);
    renderPricingTable(PricingService.list());
  }

  /** Deletes a pricing rule. */
  function onDeletePricing(id) {
    PricingService.remove(id);
    renderPricingTable(PricingService.list());
    toast("Price rule deleted");
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  /** Fetches dashboard data and renders all stats and tables. */
  function onShowDashboard() {
    renderDashboard(
      DashboardService.getStats(),
      DashboardService.getRecentTransactions(),
      DashboardService.getInventoryStatus(),
    );
  }

  // ─── Initialisation ───────────────────────────────────────────────────────────

  /** Bootstraps the app: seeds data, attaches global listeners, renders POS. */
  function init() {
    seedDatabase();
    _attachGlobalListeners();
    _refreshItemGrid();
  }

  /**
   * Attaches document-level input listeners for inputs that are dynamically
   * rendered (and therefore can't use inline oninput attributes at parse time).
   */
  function _attachGlobalListeners() {
    document.addEventListener("input", (e) => {
      if (e.target.id === "restock-qty") _refreshRestockPreview();
      if (e.target.id === "tendered") onTenderedChange();
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  return {
    init,

    /** Navigates to a page and triggers any page-specific setup. */
    showPage(pageId, event) {
      showPage(pageId, event);
      if (pageId === "dashboard") onShowDashboard();
      if (pageId === "inventory") renderInventoryTable(ItemService.list("all", _inventorySearch));
      if (pageId === "pricing") renderPricingTable(PricingService.list());
      if (pageId === "restock") initRestockUI();
    },

    // POS
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

    // Inventory
    onInventorySearch,
    onAddItem,
    onEditItem,
    onSaveItem,
    onDeleteItem,
    addUnitVariantRow,   // exposed for "＋ Add Variant" button in HTML

    // Restock
    initRestockUI,
    onRestockItemChange,
    onRestockUnitSelect,
    onDoRestock,

    // Pricing
    onOpenAddPricing,
    onSavePricing,
    onTogglePricing,
    onDeletePricing,

    // Modal helpers (called directly from HTML)
    openModal,
    closeModal,
  };
})();