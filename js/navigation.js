// ===================== NAVIGATION =====================

function showPage(page) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");

  const pages = [
    "pos",
    "inventory",
    "restock",
    "pricing",
    "categories",
    "transactions",
    "recentsales",
    "stocklogs",
  ];
  const idx = pages.indexOf(page);
  if (idx >= 0)
    document.querySelectorAll(".nav-item")[idx].classList.add("active");

  if (page === "pos") renderPOSItems();
  if (page === "inventory") renderInventory();
  if (page === "restock") initRestockPage();
  if (page === "pricing") renderPricingPage();
  if (page === "categories") renderCategoriesPage();
  if (page === "transactions") renderTransactions();
  if (page === "recentsales") renderRecentSalesPage();
  if (page === "stocklogs") renderStockLogsPage();
}

// ===================== TABS =====================
function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((t, i) => {
    t.classList.toggle("active", ["basic", "units"][i] === tab);
  });
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
}
