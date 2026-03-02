/**
 * storage.js
 * localStorage persistence for the new schema db object.
 */

const DB_KEY = "store_db_v2"; // v2 to avoid collision with old schema

function persistDb() {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        // Persist session state separately
        if (currentUser) {
            localStorage.setItem("current_user_id", String(currentUser.id));
        }
        if (currentCashFund) {
            localStorage.setItem("current_cash_fund_id", String(currentCashFund.id));
        }
    } catch (e) {
        console.warn("Sari-Sari Store: could not save to localStorage", e);
    }
}

function loadOrSeedDb() {
    try {
        const saved = localStorage.getItem(DB_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const tables = [
                "users", "security_questions", "user_security_questions",
                "categories", "units", "products",
                "product_units", "product_unit_prices", "pricing_tiers",
                "product_stock", "stock_log_reasons", "stock_movements",
                "customers", "customer_addresses",
                "payment_types", "sales", "sale_items", "sales_returns",
                "credit", "credit_payments",
                "expense_categories", "expenses",
                "cash_fund", "cash_fund_transactions",
                "_catColors", // UI extension
            ];
            tables.forEach((t) => {
                if (parsed[t] !== undefined) db[t] = parsed[t];
            });

            // Restore session
            const uid = localStorage.getItem("current_user_id");
            const cfid = localStorage.getItem("current_cash_fund_id");
            if (uid) currentUser = db.users.find((u) => u.id === parseInt(uid)) || null;
            if (cfid) currentCashFund = db.cash_fund.find((f) => f.id === parseInt(cfid)) || null;
            // Fall back to admin if nothing stored
            if (!currentUser) currentUser = db.users.find((u) => !u.is_deleted) || null;
            if (!currentCashFund) {
                currentCashFund = db.cash_fund.find((f) => f.closed_at === null) || null;
            }
            return true;
        }
    } catch (e) {
        console.warn("Sari-Sari Store: could not load from localStorage", e);
    }
    seedData();
    persistDb();
    return false;
}

function resetPersistedData() {
    if (confirm("This will delete ALL stored data and reload with demo data. Are you sure?")) {
        localStorage.removeItem(DB_KEY);
        localStorage.removeItem("current_user_id");
        localStorage.removeItem("current_cash_fund_id");
        location.reload();
    }
}