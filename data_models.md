# Data Models

## Items

| Column                  | Description                    | Sample Value |
| ----------------------- | ------------------------------ | ------------ |
| id                      | Unique identifier for the item | 1            |
| item_name               | Name of the item               | Rice 5kg     |
| category                | Item category or type          | Groceries    |
| base_unit               | Smallest standard unit         | kg           |
| purchase_price_per_unit | Purchase price per base unit   | 2.50         |
| selling_price_per_unit  | Selling price per base unit    | 3.00         |
| stock_quantity          | Quantity in base units         | 100          |

## Item Units

| Column         | Description                    | Sample Value    |
| -------------- | ------------------------------ | --------------- |
| id             | Unique identifier for the unit | 1               |
| item_id        | Reference to Items             | 1               |
| unit_name      | Name of the unit               | sack            |
| pack_quantity  | Number of base units per unit  | 20              |
| purchase_price | Purchase price per unit        | 50.00           |
| selling_price  | Selling price per unit         | 60.00           |
| note           | Additional notes               | Premium quality |

## Custom Pricing

| Column     | Description                            | Sample Value    |
| ---------- | -------------------------------------- | --------------- |
| id         | Unique identifier for the custom price | 1               |
| item_id    | Reference to Items                     | 1               |
| title      | Title of the custom pricing            | Bulk Discount   |
| quantity   | Number of base units covered           | 50              |
| price      | Total price for the quantity           | 140.00          |
| note       | Additional notes                       | For restaurants |
| active     | Whether pricing is active              | true            |
| start_date | Start date for the custom price        | 2024-01-01      |
| end_date   | End date for the custom price          | 2024-12-31      |
