// ===================== LOW STOCK ALERTS STATE =====================
let bannerDismissed = false;

// ===================== LOW STOCK QUERIES =====================
function getLowStockItems() {
  return db.items.filter(
    (item) =>
      item.low_stock_threshold > 0 &&
      item.stock_quantity <= item.low_stock_threshold,
  );
}

function getOutOfStockItems() {
  return db.items.filter((item) => item.stock_quantity <= 0);
}

// ===================== UPDATE ALL ALERT UI =====================
function updateLowStockAlerts() {
  const lowItems = getLowStockItems();

  // Update nav badge
  const badgeEl = document.getElementById("nav-low-stock-badge");
  if (lowItems.length > 0) {
    badgeEl.textContent = lowItems.length;
    badgeEl.style.display = "inline-block";
  } else {
    badgeEl.style.display = "none";
  }

  // Update global banner
  const bannerEl = document.getElementById("low-stock-banner");
  const chipsEl = document.getElementById("low-stock-chips");
  if (lowItems.length > 0 && !bannerDismissed) {
    bannerEl.style.display = "flex";
    chipsEl.innerHTML = lowItems
      .map((item) => {
        const isOut = item.stock_quantity <= 0;
        return `<span class="low-stock-chip ${isOut ? "out" : ""}" onclick="showPage('inventory')" title="Click to view inventory">
                ${item.emoji || "📦"} ${item.item_name}: ${formatStock(item)} ${item.base_unit}${isOut ? " (Out)" : ""}
            </span>`;
      })
      .join("");
  } else {
    bannerEl.style.display = "none";
  }

  // Update inventory panel
  updateInventoryLowStockPanel(lowItems);
}

function updateInventoryLowStockPanel(lowItems) {
  const panel = document.getElementById("inv-low-stock-panel");
  if (!panel) return;

  if (!lowItems || lowItems.length === 0) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  const tbody = document.getElementById("low-stock-tbody");
  tbody.innerHTML = lowItems
    .map((item) => {
      const isOut = item.stock_quantity <= 0;
      const pct =
        item.low_stock_threshold > 0
          ? Math.min(
              100,
              Math.round(
                (item.stock_quantity / item.low_stock_threshold) * 100,
              ),
            )
          : 100;
      const barColor = isOut ? "var(--red)" : "var(--orange)";
      return `<tr>
            <td><strong>${item.emoji || "📦"} ${item.item_name}</strong></td>
            <td>
                <strong style="color:${isOut ? "var(--red)" : "var(--orange)"}">
                    ${formatStock(item)} ${item.base_unit}
                </strong>
                <div style="margin-top:4px;background:rgba(0,0,0,0.08);border-radius:4px;height:5px;width:100px;overflow:hidden;">
                    <div style="width:${pct}%;background:${barColor};height:100%;border-radius:4px;transition:width 0.3s;"></div>
                </div>
            </td>
            <td style="color:var(--text2);">${item.low_stock_threshold} ${item.base_unit}</td>
            <td>${
              isOut
                ? '<span class="badge badge-red">Out of Stock</span>'
                : '<span class="badge badge-orange">Low Stock</span>'
            }</td>
            <td>
                <button class="btn btn-sm" style="background:var(--green-light);color:var(--green);" onclick="quickRestock(${item.id})">Restock</button>
                <button class="btn btn-sm btn-secondary" style="margin-left:4px;" onclick="editItem(${item.id})">Edit Min.</button>
            </td>
        </tr>`;
    })
    .join("");
}

function dismissLowStockBanner() {
  bannerDismissed = true;
  document.getElementById("low-stock-banner").style.display = "none";
}
