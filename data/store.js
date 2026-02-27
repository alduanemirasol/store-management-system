let db = {
  items: [],
  item_units: [],
  custom_pricing: [],
  transactions: [],
  restock_history: [],
  categories: [],
  stock_logs: [],
};

let nextId = {};

function newId(type) {
  return nextId[type]++;
}

function seedData() {
  db.categories = [
    { id: 1, name: "Grains", emoji: "🌾", color: "yellow" },
    { id: 2, name: "Dairy & Eggs", emoji: "🥚", color: "blue" },
    { id: 3, name: "Condiments", emoji: "🫙", color: "orange" },
    { id: 4, name: "Sweets", emoji: "🍬", color: "green" },
    { id: 5, name: "Vegetables", emoji: "🥬", color: "green" },
  ];

  db.items = [
    {
      id: 1,
      item_name: "Rice",
      category: "Grains",
      base_unit: "kg",
      purchase_price_per_unit: 55,
      selling_price_per_unit: 57,
      stock_quantity: 150,
      low_stock_threshold: 20,
      default_selling_unit: "base",
      emoji: "🌾",
    },
    {
      id: 2,
      item_name: "Egg",
      category: "Dairy & Eggs",
      base_unit: "piece",
      purchase_price_per_unit: 9,
      selling_price_per_unit: 9,
      stock_quantity: 90,
      low_stock_threshold: 30,
      default_selling_unit: "base",
      emoji: "🥚",
    },
    {
      id: 3,
      item_name: "Cooking Oil",
      category: "Condiments",
      base_unit: "mL",
      purchase_price_per_unit: 0.148,
      selling_price_per_unit: 0.148,
      stock_quantity: 60000,
      low_stock_threshold: 5000,
      default_selling_unit: "unit-1",
      emoji: "🫙",
    },
    {
      id: 4,
      item_name: "Candy",
      category: "Sweets",
      base_unit: "piece",
      purchase_price_per_unit: 1,
      selling_price_per_unit: 1.5,
      stock_quantity: 500,
      low_stock_threshold: 50,
      default_selling_unit: "base",
      emoji: "🍬",
    },
    {
      id: 5,
      item_name: "Cabbage",
      category: "Vegetables",
      base_unit: "kg",
      purchase_price_per_unit: 100,
      selling_price_per_unit: 180.5,
      stock_quantity: 25,
      low_stock_threshold: 5,
      default_selling_unit: "unit-1",
      emoji: "🥬",
    },
  ];

  db.item_units = [
    {
      id: 1,
      item_id: 1,
      unit_name: "sack",
      pack_quantity: 50,
      purchase_price: 2750,
      selling_price: 2850,
      note: "1 sack = 50 kg",
    },
    {
      id: 2,
      item_id: 2,
      unit_name: "tray",
      pack_quantity: 30,
      purchase_price: 270,
      selling_price: 270,
      note: "1 tray = 30 pieces",
    },
    {
      id: 3,
      item_id: 3,
      unit_name: "250 mL",
      pack_quantity: 250,
      purchase_price: 33,
      selling_price: 37,
      note: "250 mL serving",
    },
    {
      id: 4,
      item_id: 3,
      unit_name: "container",
      pack_quantity: 20000,
      purchase_price: 2960,
      selling_price: 2960,
      note: "1 container = 20,000 mL",
    },
    {
      id: 5,
      item_id: 4,
      unit_name: "pack",
      pack_quantity: 100,
      purchase_price: 100,
      selling_price: 130,
      note: "1 pack = 100 pieces",
    },
    {
      id: 6,
      item_id: 5,
      unit_name: "piece",
      pack_quantity: 0.5,
      purchase_price: 50,
      selling_price: 25,
      note: "~0.5 kg per piece",
    },
    {
      id: 7,
      item_id: 5,
      unit_name: "sack",
      pack_quantity: 25,
      purchase_price: 2500,
      selling_price: 4512.5,
      note: "1 sack = 25 kg",
    },
  ];

  db.custom_pricing = [
    {
      id: 1,
      item_id: 4,
      title: "3 for 5 Deal",
      quantity: 3,
      price: 5,
      note: "Buy 3 candies for 5 PHP",
      active: true,
      start_date: "",
      end_date: "",
    },
  ];

  nextId = {
    items: 6,
    item_units: 8,
    custom_pricing: 2,
    transactions: 1,
    restock_history: 1,
    categories: 6,
    stock_logs: 1,
  };
}
