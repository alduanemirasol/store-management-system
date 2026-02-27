function formatStock(item) {
  return Number(item.stock_quantity).toLocaleString(undefined, {
    maximumFractionDigits: 2,
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
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
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
  document.querySelectorAll(".modal-backdrop").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    });
  });
});
