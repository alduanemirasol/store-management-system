function formatStock(item) {
  return Number(item.stock_quantity).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatPeso(amount, decimals = 2) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("open");
    modal.style.display = "flex";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("open");
    modal.style.display = "none";
  }
}

function relativeTime(date) {
  const diffMin = Math.floor((new Date() - new Date(date)) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return diffMin + "m ago";
  if (diffMin < 1440) return Math.floor(diffMin / 60) + "h ago";
  return Math.floor(diffMin / 1440) + "d ago";
}

function newId(table) {
  const arr = db[table] || [];
  return arr.length ? Math.max(...arr.map((r) => r.id || 0)) + 1 : 1;
}

document.addEventListener("DOMContentLoaded", () => {
  // Modal click-outside-to-close disabled per user request
});