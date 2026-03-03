/**
 * navigation.js
 * Page switching and tab switching.
 */

function showPage(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));

  const pageEl = document.getElementById("page-" + page);
  if (pageEl) pageEl.classList.add("active");

  const pages = [
    "pos", "inventory", "restock", "pricing",
    "categories", "transactions", "recentsales", "stocklogs", "saleshistory", "customers", "utang",
  ];
  const idx = pages.indexOf(page);
  if (idx >= 0) {
    const navItems = document.querySelectorAll(".nav-item");
    if (navItems[idx]) navItems[idx].classList.add("active");
  }

  if (page === "pos") renderPOSItems();
  if (page === "inventory") renderInventory();
  if (page === "restock") initRestockPage();
  if (page === "pricing") renderPricingPage();
  if (page === "categories") renderCategoriesPage();
  if (page === "transactions") renderTransactions();
  if (page === "recentsales") renderRecentSalesPage();
  if (page === "stocklogs") renderStockLogsPage();
  if (page === "saleshistory") renderSalesHistoryPage();
  if (page === "customers") renderCustomersPage();
  if (page === "utang") renderUtangPage();
}

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((t, i) => {
    t.classList.toggle("active", ["basic", "units"][i] === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById("tab-" + tab);
  if (panel) panel.classList.add("active");
}