/**
 * categories.js
 * Category CRUD — updated for new schema.
 *
 * Schema: categories(id, name, description, created_at, updated_at)
 * UI extensions stored alongside (not in schema):
 *   - categories[].emoji  (added as extra field on the row)
 *   - db._catColors[catId] = colorKey  (stored in helpers.js getCatUIColor/setCatUIColor)
 */

const CAT_EMOJIS = [
  "🌾", "🥚", "🫙", "🍬", "🥬", "🥩", "🧃", "🍿", "🧴", "🛒",
  "🧁", "🍞", "🍎", "🐟", "🧹", "💊", "🍫", "🥤", "🧂", "🍳",
];

let editingCatId = null;
let calledFromItemModal = false;

function populateCategorySelect(selectId, selectedCatId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML =
    '<option value="">— Select category —</option>' +
    db.categories
      .map((c) => `<option value="${c.id}" ${c.id === selectedCatId ? "selected" : ""}>${c.emoji || ""} ${c.name}</option>`)
      .join("");
}

function renderCategoriesPage() {
  const tbody = document.getElementById("cat-tbody");
  if (!db.categories.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="page-empty">No categories yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = db.categories.map((cat) => {
    const itemCount = db.products.filter((p) => p.category_id === cat.id && !p.is_deleted).length;
    const colorKey = getCatUIColor(cat.id);
    const colorObj = CAT_COLORS.find((c) => c.key === colorKey) || CAT_COLORS[0];
    return `<tr>
      <td><strong>${cat.name}</strong></td>
      <td style="font-size:20px;">${cat.emoji || "—"}</td>
      <td>
        <span class="badge badge-${colorKey}">
          <span style="width:8px;height:8px;border-radius:50%;background:${colorObj.text};display:inline-block;"></span>
          ${colorObj.label}
        </span>
      </td>
      <td>${itemCount} item${itemCount !== 1 ? "s" : ""}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal(${cat.id})">Edit</button>
          <button class="btn btn-sm" style="background:var(--red-light);color:var(--red);"
            onclick="deleteCategory(${cat.id})"
            ${itemCount > 0 ? 'disabled title="Cannot delete: category has items"' : ""}>Delete</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

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
  const colorKey = getCatUIColor(catId);
  document.getElementById("cat-color").value = colorKey;
  renderCatEmojiPresets(cat.emoji || "");
  renderCatColorPresets(colorKey);
  updateCatPreview();
  openModal("modal-category");
}

function renderCatEmojiPresets(selected) {
  const el = document.getElementById("cat-emoji-presets");
  el.innerHTML = CAT_EMOJIS.map((e) =>
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
  el.innerHTML = CAT_COLORS.map((c) =>
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
  const now = new Date().toISOString();

  if (!name) { toast("Category name is required", "error"); return; }

  const duplicate = db.categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCatId,
  );
  if (duplicate) { toast("A category with that name already exists", "error"); return; }

  if (editingCatId) {
    const cat = db.categories.find((c) => c.id === editingCatId);
    Object.assign(cat, { name, emoji, updated_at: now });
    setCatUIColor(editingCatId, color);
    toast("Category updated!", "success");
  } else {
    const newCat = {
      id: newId("categories"),
      name, emoji,
      description: null,
      created_at: now,
      updated_at: now,
    };
    db.categories.push(newCat);
    setCatUIColor(newCat.id, color);
    toast(`Category "${name}" created!`, "success");
  }

  closeModal("modal-category");
  persistDb();

  if (calledFromItemModal) {
    const sel = document.getElementById("item-category");
    const cat = db.categories.find((c) => c.name === name);
    populateCategorySelect("item-category", cat ? cat.id : null);
  } else {
    renderCategoriesPage();
    renderInventory();
    renderPOSItems();
  }
}

function deleteCategory(catId) {
  const cat = db.categories.find((c) => c.id === catId);
  if (!cat) return;
  const itemCount = db.products.filter((p) => p.category_id === catId && !p.is_deleted).length;
  if (itemCount > 0) { toast("Remove all items in this category first", "error"); return; }
  db.categories = db.categories.filter((c) => c.id !== catId);
  persistDb();
  renderCategoriesPage();
  toast(`Category "${cat.name}" deleted`, "info");
}

document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("cat-name");
  if (nameEl) nameEl.addEventListener("input", updateCatPreview);
  const emojiEl = document.getElementById("cat-emoji");
  if (emojiEl) emojiEl.addEventListener("input", () => {
    renderCatEmojiPresets(emojiEl.value.trim());
    updateCatPreview();
  });
});