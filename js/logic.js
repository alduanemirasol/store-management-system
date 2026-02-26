/**
 * logic.js
 * ─────────────────────────────────────────────
 * Responsibility: Event handlers and page
 * controllers. The glue between UI (DOM events)
 * and Services (business operations).
 *
 * No direct DOM manipulation beyond reading
 * form values — delegates all rendering to ui.js
 * and all data changes to services.js.
 *
 * Exposed as: window.Logic  (called from HTML onclick)
 * ─────────────────────────────────────────────
 */

const Logic = (() => {
  /* ─── POS state ──────────────────────────────── */

  /** @type {{ type: string, unitId: number|null, pricingId: number|null, qty: number }} */
  let _sellSelection = { type: "base", unitId: null, pricingId: null, qty: 1 };

  /** @type {object|null} The item currently open in the sell modal. */
  let _currentSellItem = null;

  /** @type {string} Active category filter on the POS grid. */
  let _currentCategory = "all";

  /** @type {string} Search query on the POS grid. */
  let _posSearch = "";

  /* ─── Inventory state ────────────────────────── */

  /** @type {string} Search query on the inventory page. */
  let _inventorySearch = "";

  /* ─── Restock state ──────────────────────────── */

  /** @type {'base'|'unit'} Selected restock unit type. */
  let _restockUnitType = "base";

  /** @type {number|null} Selected unit variant id for restocking. */
  let _restockUnitId = null;

  /* ═══════════════════════════════════════════════
     POS — Item Grid
  ═══════════════════════════════════════════════ */

  /** Refresh the item grid with current filters. */
  function _refreshItemGrid() {
    const items = ItemService.list(_currentCategory, _posSearch);
    renderItemGrid(items);
  }

  /**
   * Handle category tag click on POS page.
   * @param {string}      cat
   * @param {HTMLElement} el   — the clicked tag element
   */
  function onCategoryFilter(cat, el) {
    _currentCategory = cat;
    document
      .querySelectorAll(".tag[data-cat]")
      .forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
    _refreshItemGrid();
  }

  /**
   * Handle POS search input changes.
   * @param {string} val
   */
  function onPosSearch(val) {
    _posSearch = val;
    _refreshItemGrid();
  }

  /**
   * Handle click on a product card — open the sell modal.
   * @param {number} itemId
   */
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

  /* ═══════════════════════════════════════════════
     POS — Sell Modal
  ═══════════════════════════════════════════════ */

  /**
   * Handle unit-option selection inside the sell modal.
   * Called from onclick attributes rendered in ui.js.
   *
   * @param {'base'|'unit'|'pricing'} type
   * @param {number|null} unitId
   * @param {number|null} pricingId
   */
  function onSellTypeSelect(type, unitId, pricingId) {
    _sellSelection.type = type;
    _sellSelection.unitId = unitId;
    _sellSelection.pricingId = pricingId;
    activateSellOption(event.currentTarget);
    _refreshSellPreview();
  }

  /** Handle quantity or override-price changes in the sell modal. */
  function onSellQtyChange() {
    _refreshSellPreview();
  }

  /** Recompute and display the sell-preview line. */
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

  /** "Add to Cart" button handler in the sell modal. */
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

  /* ═══════════════════════════════════════════════
     POS — Cart
  ═══════════════════════════════════════════════ */

  /** Re-render the cart panel from current CartService state. */
  function _refreshCart() {
    renderCart(CartService.getItems(), CartService.getTotal());
  }

  /**
   * Handle trash-icon click on a cart line item.
   * @param {number} index
   */
  function onRemoveCartItem(index) {
    CartService.removeItem(index);
    _refreshCart();
  }

  /** "Clear" button handler on the cart. */
  function onClearCart() {
    CartService.clear();
    _refreshCart();
  }

  /** Recalculate and display change when tendered amount changes. */
  function onTenderedChange() {
    renderChangeDisplay(CartService.getTotal());
  }

  /** "Complete Sale" button handler. */
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

  /* ═══════════════════════════════════════════════
     INVENTORY
  ═══════════════════════════════════════════════ */

  /** Refresh the inventory table with current search filter. */
  function _refreshInventoryTable() {
    const items = ItemService.list("all", _inventorySearch);
    renderInventoryTable(items);
  }

  /**
   * Handle inventory search input.
   * @param {string} val
   */
  function onInventorySearch(val) {
    _inventorySearch = val;
    _refreshInventoryTable();
  }

  /** "Add Item" button click handler — open blank form. */
  function onAddItem() {
    populateItemForm(null, []);
    openModal("add-item-modal");
  }

  /**
   * "Edit" button click handler — open form pre-filled.
   * @param {number} id
   */
  function onEditItem(id) {
    const item = getItem(id);
    const units = getUnits(id);
    populateItemForm(item, units);
    openModal("add-item-modal");
  }

  /** "Save Item" button handler (Add or Edit). */
  function onSaveItem() {
    const form = readItemForm();

    if (!form.item_name || !form.base_unit) {
      toast("Name and base unit are required", "error");
      return;
    }

    if (form.id) {
      // Edit
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
      // Create
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

  /**
   * "Del" button handler for an inventory row.
   * @param {number} id
   */
  function onDeleteItem(id) {
    if (!confirm("Delete this item?")) return;
    ItemService.remove(id);
    _refreshInventoryTable();
    _refreshItemGrid();
    toast("Item deleted");
  }

  /* ═══════════════════════════════════════════════
     RESTOCK
  ═══════════════════════════════════════════════ */

  /** Initialize the Restock page dropdowns and reset state. */
  function initRestockUI() {
    _restockUnitType = "base";
    _restockUnitId = null;
    populateRestockItemSelect(ItemService.list());
    renderRestockHistoryTable(RestockService.getHistory());
  }

  /** Handle item selection change on the restock form. */
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

  /**
   * Handle unit-option click on restock form.
   * @param {'base'|'unit'} type
   * @param {number|null}   unitId
   * @param {HTMLElement}   el
   */
  function onRestockUnitSelect(type, unitId, el) {
    _restockUnitType = type;
    _restockUnitId = unitId;
    activateRestockOption(el);
    _refreshRestockPreview();
  }

  /** Handle restock-qty input changes. */
  function onRestockQtyChange() {
    _refreshRestockPreview();
  }

  /** Recompute and display the restock preview. */
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

  /** "Confirm Restock" button handler. */
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

  /* ═══════════════════════════════════════════════
     CUSTOM PRICING
  ═══════════════════════════════════════════════ */

  /** "Add Price Rule" button click handler. */
  function onOpenAddPricing() {
    populatePricingItemSelect(ItemService.list());
    resetPricingForm();
    openModal("add-pricing-modal");
  }

  /** "Save Rule" button handler in the pricing modal. */
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

  /**
   * Toggle active state of a pricing rule.
   * @param {number} id
   */
  function onTogglePricing(id) {
    PricingService.toggle(id);
    renderPricingTable(PricingService.list());
  }

  /**
   * Delete a pricing rule.
   * @param {number} id
   */
  function onDeletePricing(id) {
    PricingService.remove(id);
    renderPricingTable(PricingService.list());
    toast("Price rule deleted");
  }

  /* ═══════════════════════════════════════════════
     DASHBOARD
  ═══════════════════════════════════════════════ */

  /** Refresh all dashboard sections. */
  function onShowDashboard() {
    renderDashboard(
      DashboardService.getStats(),
      DashboardService.getRecentTransactions(),
      DashboardService.getInventoryStatus(),
    );
  }

  /* ═══════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════ */

  /**
   * Bootstrap the application:
   *   1. Seed the database.
   *   2. Attach global DOM event listeners.
   *   3. Render the initial POS view.
   */
  function init() {
    seedDatabase();
    _attachGlobalListeners();
    _refreshItemGrid();
  }

  /** Attach listeners that can't use simple inline onclick (e.g. input events). */
  function _attachGlobalListeners() {
    document.addEventListener("input", (e) => {
      if (e.target.id === "restock-qty") onRestockQtyChange();
      if (e.target.id === "tendered") onTenderedChange();
    });
  }

  /* ─── Public API ─────────────────────────────── */
  return {
    init,

    // Navigation
    showPage: (pageId, event) => {
      showPage(pageId, event);
      if (pageId === "dashboard") onShowDashboard();
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
    addUnitVariantRow, // called from HTML button inside the modal

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

    // Modal helpers (called from HTML)
    closeModal,
    openModal,
  };
})();
