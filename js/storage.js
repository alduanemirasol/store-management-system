const DB_KEY = "shopease_db";

function persistDb() {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
        console.warn("ShopEase: could not save to localStorage", e);
    }
}

function loadOrSeedDb() {
    try {
        const saved = localStorage.getItem(DB_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const tables = [
                "items",
                "item_units",
                "categories",
                "custom_pricing",
                "transactions",
                "stock_logs",
                "restock_history",
            ];
            tables.forEach((t) => {
                if (parsed[t] !== undefined) db[t] = parsed[t];
            });
            return true;
        }
    } catch (e) {
        console.warn("ShopEase: could not load from localStorage", e);
    }
    seedData();
    persistDb();
    return false;
}

function resetPersistedData() {
    if (
        confirm(
            "This will delete ALL stored data and reload with demo data. Are you sure?",
        )
    ) {
        localStorage.removeItem(DB_KEY);
        location.reload();
    }
}