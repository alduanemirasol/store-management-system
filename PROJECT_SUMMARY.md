# Project Name

**Sari-Sari Store POS & Inventory System**

---

## Purpose / Description

A comprehensive retail Point of Sale (POS) and Inventory Management system designed specifically for Filipino "Sari-Sari" (small retail) stores. The system handles product catalog management, sales transactions, inventory tracking with low-stock alerts, flexible pricing tiers (bulk, bundle, volume discounts), customer management, and credit tracking.

The application is a client-side single-page application that uses an in-memory database (JavaScript objects) simulating a MySQL schema, with data persisted via browser localStorage.

---

## Tech Stack

| Layer                | Technology                                             |
| -------------------- | ------------------------------------------------------ |
| **Frontend**         | Vanilla HTML5, CSS3, JavaScript (ES6+)                 |
| **Database**         | In-memory JavaScript objects (simulating MySQL schema) |
| **Data Persistence** | Browser localStorage                                   |
| **Fonts**            | Google Fonts (Inter)                                   |
| **Currency**         | Philippine Peso (PHP/₱)                                |

---

## Folder / File Structure

```
store-management-system/
├── index.html                  # Main entry point - single-page application
├── new_schema.txt              # MySQL database schema documentation (v2)
├── schema_ai_context.txt       # AI context for understanding database structure
├── scenarios.txt               # Product scenarios with unit conversions
│
├── data/
│   └── store.js                # In-memory database with seed data (13 products)
│
├── js/
│   ├── alerts.js               # Low stock alert banner and notifications
│   ├── categories.js           # Category management module
│   ├── helpers.js              # Utility functions and shared helpers
│   ├── inventory.js            # Inventory management (add/edit/delete products)
│   ├── navigation.js           # Page navigation and routing
│   ├── pos.js                  # Point of Sale - cart, checkout, sales
│   ├── pricing.js              # Pricing tiers management (bulk, bundle, volume)
│   ├── reports.js              # Transactions and sales reports
│   ├── restock.js              # Restock inventory management
│   ├── services.js             # Data persistence (localStorage sync)
│   └── storage.js              # LocalStorage helpers
│
└── styles/
    ├── main.css                # Global styles, CSS variables, layout
    ├── components.css          # Reusable UI components (buttons, modals, tables)
    ├── pos.css                 # POS page specific styles
    └── inventory.css           # Inventory page specific styles
```

---

## Main Modules / Components

### 1. Point of Sale (POS) - [`js/pos.js`](js/pos.js)

- Product grid with search and category filtering
- Shopping cart management
- Multiple selling units per product (e.g., kg, sack, piece)
- Pricing tier application (bundle, volume discount, flat rate)
- Checkout process with payment type selection
- Recent sales panel display

### 2. Inventory Management - [`js/inventory.js`](js/inventory.js)

- Product CRUD operations (Create, Read, Update, Delete)
- Product search and category filtering
- Low stock panel with threshold alerts
- Stock level display with base unit tracking
- Buy/sell price management

### 3. Categories - [`js/categories.js`](js/categories.js)

- Category CRUD operations
- Category color and emoji assignment
- Product count per category

### 4. Pricing Tiers - [`js/pricing.js`](js/pricing.js)

- Multiple pricing types:
  - **BUNDLE_PRICE**: Fixed price for exact quantity (e.g., 3 pcs = ₱5)
  - **VOLUME_DISCOUNT**: Price per unit for quantity range
  - **FLAT_RATE**: Fixed rate regardless of quantity
- Date-based effective periods

### 5. Restock - [`js/restock.js`](js/restock.js)

- Inventory restocking interface
- Low stock threshold display
- Stock status indicators

### 6. Transactions - [`js/reports.js`](js/reports.js)

- Sales transaction history
- Transaction statistics (daily, weekly, monthly totals)
- Detailed transaction views

### 7. Recent Sales - [`js/reports.js`](js/reports.js)

- Individual sale item breakdown
- Date range filtering (Today, This Week, This Month)
- Search by item name

### 8. Stock Logs - [`js/reports.js`](js/reports.js)

- Full audit trail of inventory changes
- Filter by change type (Sale, Restock)
- Date range filtering

---

## Database Schema (In-Memory)

The application uses a MySQL-compatible schema defined in [`data/store.js`](data/store.js):

### Core Tables

| Table                 | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `users`               | Staff accounts with PIN authentication           |
| `categories`          | Product category groupings                       |
| `units`               | Standard measurement units (kg, mL, piece, etc.) |
| `products`            | Master product catalog                           |
| `product_units`       | Selling/restocking packaging options per product |
| `product_unit_prices` | Base purchase and selling prices                 |
| `pricing_tiers`       | Bulk, bundle, and promotional pricing rules      |
| `product_stock`       | Current inventory quantities (in base unit)      |
| `stock_movements`     | Full audit trail of inventory changes            |
| `customers`           | Registered buyer profiles                        |
| `sales`               | Transaction headers                              |
| `sale_items`          | Individual line items per sale                   |
| `sales_returns`       | Product returns and refunds                      |
| `credit`              | Outstanding customer credit balances             |
| `credit_payments`     | Credit payment records                           |
| `expense_categories`  | Business expense classifications                 |
| `expenses`            | Expense records                                  |

### Key Schema Rules

1. **Soft Deletes**: Products, users, and customers use `is_deleted = TRUE` instead of permanent deletion
2. **Stock Always in Base Unit**: Inventory is tracked in the product's base unit; conversions happen in the UI layer
3. **No Derived Values**: Computed columns (e.g., sale totals) are calculated at query time

---

## Important Configurations

### Currency

- All monetary values in **Philippine Peso (₱)**

### Units Supported

- **Count**: piece, pack, box
- **Weight**: kg, g, oz
- **Volume**: mL, L
- **Length**: m, cm
- **Custom**: User-defined units

### Product Examples (from seed data)

| Product     | Base Unit | Selling Options     | Restock Options |
| ----------- | --------- | ------------------- | --------------- |
| Rice        | kg        | kg, sack            | kg, sack        |
| Egg         | piece     | piece, tray         | piece, tray     |
| Cooking Oil | mL        | mL, container, pack | mL, container   |
| Candy       | piece     | piece, pack         | piece, pack     |
| Onion       | kg        | kg, piece, sack     | kg, piece, sack |
| Beer        | bottle    | bottle, case        | bottle, case    |
| Shampoo     | sachet    | sachet, pack        | sachet, pack    |

### Data Persistence

- Uses browser **localStorage** for data persistence
- Includes **Reset All Data** button to clear persisted data

---

## Dependencies

### External Dependencies

| Dependency           | Version | Purpose       |
| -------------------- | ------- | ------------- |
| Google Fonts (Inter) | -       | UI typography |

### No npm/Build Dependencies

This is a **vanilla JavaScript** application with no:

- `package.json`
- No build tools (Webpack, Vite, etc.)
- No frontend frameworks (React, Vue, Angular)
- No backend server required

---

## How to Run / Build

### Running the Application

1. **Open in Browser**: Simply open [`index.html`](index.html) in any modern web browser (Chrome, Firefox, Edge, Safari)

   ```bash
   # Option 1: Direct file open
   file:///path/to/store-management-system/index.html

   # Option 2: Using local server (optional but recommended)
   npx serve .
   # or
   python -m http.server 8000
   ```

2. **No Build Step Required**: The application is pure static HTML/CSS/JS

### Development

- Edit any `.js` or `.css` file directly - no compilation needed
- Changes are reflected immediately on browser refresh
- Use browser DevTools (F12) for debugging

### Data Reset

- Click the **"Reset All Data"** button in the sidebar to clear localStorage and restore seed data

---

## Features Summary

| Feature                            | Status |
| ---------------------------------- | ------ |
| Point of Sale with cart            | ✅     |
| Multiple selling units per product | ✅     |
| Inventory management (CRUD)        | ✅     |
| Category management                | ✅     |
| Pricing tiers (bundle/volume/flat) | ✅     |
| Low stock alerts                   | ✅     |
| Restock management                 | ✅     |
| Transaction history                | ✅     |
| Recent sales tracking              | ✅     |
| Stock movement audit logs          | ✅     |
| Data persistence (localStorage)    | ✅     |
| Reset data functionality           | ✅     |

---

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

Requires JavaScript enabled and localStorage support.
