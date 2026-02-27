// ===================== CATEGORIES STATE =====================
const CAT_COLORS = [
  { key: "blue", label: "Blue", bg: "#eef2ff", text: "#3b6ef0" },
  { key: "green", label: "Green", bg: "#dcfce7", text: "#16a34a" },
  { key: "orange", label: "Orange", bg: "#ffedd5", text: "#ea580c" },
  { key: "red", label: "Red", bg: "#fee2e2", text: "#dc2626" },
  { key: "yellow", label: "Yellow", bg: "#fef3c7", text: "#d97706" },
];
const CAT_EMOJIS = [
  "🌾",
  "🥚",
  "🫙",
  "🍬",
  "🥬",
  "🥩",
  "🧃",
  "🍿",
  "🧴",
  "🛒",
  "🧁",
  "🍞",
  "🍎",
  "🐟",
  "🧹",
  "💊",
  "🍫",
  "🥤",
  "🧂",
  "🍳",
];

let editingCatId = null;
let calledFromItemModal = false;

// ===================== POPULATE CATEGORY SELECT =====================
function populateCategorySelect(selectId, selectedName) {
  const sel = document.getElementById(selectId);
  sel.innerHTML =
    '<option value="">— Select category —</option>' +
    db.categories
      .map(
        (c) =>
          `<option value="${c.name}" ${c.name === selectedName ? "selected" : ""}>${c.emoji || ""} ${c.name}</option>`,
      )
      .join("");
}

// ===================== CATEGORIES PAGE =====================
function renderCategoriesPage() {
  const tbody = document.getElementById("cat-tbody");
  if (!db.categories.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px;">No categories yet.</td></tr>';
    return;
  }
  tbody.innerHTML = db.categories
    .map((cat) => {
      const itemCount = db.items.filter((i) => i.category === cat.name).length;
      const colorObj =
        CAT_COLORS.find((c) => c.key === cat.color) || CAT_COLORS[0];
      return `<tr>
      <td><strong>${cat.name}</strong></td>
      <td style="font-size:20px;">${cat.emoji || "—"}</td>
      <td>
        <span class="badge badge-${cat.color}" style="gap:4px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${colorObj.text};display:inline-block;"></span>
          ${colorObj.label}
        </span>
      </td>
      <td>${itemCount} item${itemCount !== 1 ? "s" : ""}</td>
      <td style="display:flex;gap:6px;align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal(${cat.id})">Edit</button>
        <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);"
          onclick="deleteCategory(${cat.id})"
          ${itemCount > 0 ? 'disabled title="Cannot delete: category has items"' : ""}>Delete</button>
      </td>
    </tr>`;
    })
    .join("");
}

// ===================== CATEGORY MODAL =====================
function openAddCategoryModal(fromItemModal = false) {
  calledFromItemModal = fromItemModal;
  editingCatId = null;
  document.getElementById("cat-modal-title").textContent = "Add Category";
  document.getElementById("cat-name").value = "";
  document.getElementById("cat-emoji").value = "";
  document.getElementById("cat-color").value = "blue";
  renderCatEmojiPresets("");
  renderCatColorPresets("blue");
  updateCatPreview();
  openModal("modal-category");
}

function openEditCategoryModal(catId) {
  calledFromItemModal = false;
  editingCatId = catId;
  const cat = db.categories.find((c) => c.id === catId);
  if (!cat) return;
  document.getElementById("cat-modal-title").textContent = "Edit Category";
  document.getElementById("cat-name").value = cat.name;
  document.getElementById("cat-emoji").value = cat.emoji || "";
  document.getElementById("cat-color").value = cat.color || "blue";
  renderCatEmojiPresets(cat.emoji || "");
  renderCatColorPresets(cat.color || "blue");
  updateCatPreview();
  openModal("modal-category");
}

function renderCatEmojiPresets(selected) {
  const el = document.getElementById("cat-emoji-presets");
  el.innerHTML = CAT_EMOJIS.map(
    (e) =>
      `<span onclick="pickCatEmoji('${e}')" title="${e}"
      style="cursor:pointer;font-size:18px;padding:3px 5px;border-radius:6px;border:2px solid ${e === selected ? "var(--accent)" : "transparent"};transition:all 0.12s;"
      onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">${e}</span>`,
  ).join("");
}

function pickCatEmoji(emoji) {
  document.getElementById("cat-emoji").value = emoji;
  renderCatEmojiPresets(emoji);
  updateCatPreview();
}

function renderCatColorPresets(selected) {
  const el = document.getElementById("cat-color-presets");
  el.innerHTML = CAT_COLORS.map(
    (c) =>
      `<div onclick="pickCatColor('${c.key}')" title="${c.label}"
      style="width:24px;height:24px;border-radius:50%;background:${c.bg};border:2.5px solid ${c.key === selected ? c.text : "transparent"};cursor:pointer;box-shadow:inset 0 0 0 2px ${c.text};transition:all 0.12s;"
      onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`,
  ).join("");
}

function pickCatColor(colorKey) {
  document.getElementById("cat-color").value = colorKey;
  renderCatColorPresets(colorKey);
  updateCatPreview();
}

function updateCatPreview() {
  const name = document.getElementById("cat-name").value.trim() || "Category";
  const emoji = document.getElementById("cat-emoji").value.trim() || "";
  const color = document.getElementById("cat-color").value || "blue";
  const preview = document.getElementById("cat-badge-preview");
  preview.className = `badge badge-${color}`;
  preview.textContent = (emoji ? emoji + " " : "") + name;
}

function saveCategory() {
  const name = document.getElementById("cat-name").value.trim();
  const emoji = document.getElementById("cat-emoji").value.trim();
  const color = document.getElementById("cat-color").value || "blue";

  if (!name) {
    toast("Category name is required", "error");
    return;
  }

  const duplicate = db.categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCatId,
  );
  if (duplicate) {
    toast("A category with that name already exists", "error");
    return;
  }

  if (editingCatId) {
    const cat = db.categories.find((c) => c.id === editingCatId);
    const oldName = cat.name;
    Object.assign(cat, { name, emoji, color });
    db.items.forEach((item) => {
      if (item.category === oldName) item.category = name;
    });
    toast("Category updated!", "success");
  } else {
    db.categories.push({ id: newId("categories"), name, emoji, color });
    toast(`Category "${name}" created!`, "success");
  }

  closeModal("modal-category");

  if (calledFromItemModal) {
    populateCategorySelect("item-category", name);
  } else {
    renderCategoriesPage();
    renderInventory();
    renderPOSItems();
  }
}

function deleteCategory(catId) {
  const cat = db.categories.find((c) => c.id === catId);
  if (!cat) return;
  const itemCount = db.items.filter((i) => i.category === cat.name).length;
  if (itemCount > 0) {
    toast("Remove all items in this category first", "error");
    return;
  }
  db.categories = db.categories.filter((c) => c.id !== catId);
  renderCategoriesPage();
  toast(`Category "${cat.name}" deleted`, "info");
}

// ===================== LIVE PREVIEW LISTENERS =====================
document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("cat-name");
  if (nameEl) nameEl.addEventListener("input", updateCatPreview);
  const emojiEl = document.getElementById("cat-emoji");
  if (emojiEl)
    emojiEl.addEventListener("input", () => {
      renderCatEmojiPresets(emojiEl.value.trim());
      updateCatPreview();
    });
});
