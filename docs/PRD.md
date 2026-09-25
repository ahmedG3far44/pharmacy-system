# Pharmacy Cashier & Inventory Management System

## Product Requirements Document — MVP

**Version:** 1.0  
**Product Type:** Web-based Pharmacy POS and Inventory Management System  
**Target:** Small to medium single-branch pharmacy  
**Primary Users:** Admin, Pharmacist, Cashier  
**Initial Scope:** Single pharmacy branch  
**Architecture:** React frontend + Express API + PostgreSQL/Prisma  
**Authentication:** Phone number + password with JWT-backed server sessions

---

# 1. Product Overview

The Pharmacy Cashier & Inventory Management System is a web application designed to manage the daily operations of a pharmacy.

The MVP focuses on:

- Pharmacy cashier/POS operations
- Medicine and product management
- Batch-based inventory
- Expiry management
- Supplier management
- Purchase receiving
- Sales
- Payments
- Returns
- Inventory movements
- Low-stock monitoring
- Expiry alerts
- Basic reporting
- Employee accounts and permissions
- Auditability

The system must prioritize:

1. Fast cashier operations
2. Accurate inventory quantities
3. Batch and expiry tracking
4. Protection against unauthorized actions
5. Reliable transaction handling
6. Clear audit history

---

# 2. MVP Goals

The MVP should allow a pharmacy to operate its essential daily workflow digitally.

The system must support this complete flow:

```text
Admin creates pharmacy products
        ↓
Admin/Pharmacist creates supplier
        ↓
Admin/Pharmacist records purchase
        ↓
Product batches are created
        ↓
Inventory increases
        ↓
Cashier searches/scans medicine
        ↓
Medicine is added to cart
        ↓
Cashier completes sale
        ↓
Inventory decreases
        ↓
Receipt is generated
        ↓
Sale appears in reports/history
```

The system must also support:

```text
Customer Return
      ↓
Find Original Sale
      ↓
Select Returned Items
      ↓
Approve Return
      ↓
Refund
      ↓
Optional Inventory Restock
```

---

# 3. Out of Scope for MVP

The following are intentionally excluded from the first version:

- Multi-branch pharmacies
- Insurance integration
- Electronic prescriptions
- Doctor management
- Patient medical records
- Drug-drug interaction checking
- Loyalty points
- Online pharmacy/e-commerce
- Supplier API integration
- Accounting software integration
- Advanced business intelligence
- AI recommendations
- Automated medicine ordering
- Employee payroll
- Offline-first synchronization
- Multiple warehouses

These may be added later.

---

# 4. User Roles

The MVP contains three roles:

```text
ADMIN
PHARMACIST
CASHIER
```

---

# 5. Admin Role

Admin has complete access to pharmacy management.

Admin can:

### Dashboard

- View pharmacy-wide statistics
- View today's revenue
- View number of transactions
- View estimated profit
- View low-stock products
- View expiring products
- View expired products

### Employees

- Create employee
- Update employee
- Disable employee
- Activate employee
- Assign role
- Reset employee password
- View employee activity

### Products

- Create product
- Update product
- Archive product
- Change selling price
- Change purchase/reference price
- Manage categories
- Manage manufacturers

### Inventory

- View all inventory
- View stock by batch
- Adjust inventory
- Mark stock as damaged
- Mark batches as expired
- View inventory movements

### Purchases

- Create purchases
- Receive purchases
- View purchase history
- Cancel draft purchases

### Suppliers

- Create supplier
- Update supplier
- Disable supplier
- View supplier purchases

### Sales

- Create sale
- View all sales
- Reprint receipts
- Void transactions according to business rules

### Returns

- Process returns
- Approve refunds
- Select whether returned stock should be restocked

### Reports

- Sales report
- Revenue report
- Profit report
- Inventory report
- Purchase report
- Expiry report
- Payment report
- Employee/cashier report

### Settings

- Pharmacy information
- Currency
- Tax settings
- Receipt settings
- Low-stock thresholds
- Expiry alert thresholds

---

# 6. Pharmacist Role

Pharmacist handles medicine and stock operations.

Pharmacist can:

### POS

- Create sale
- Search products
- Scan barcode
- View medicine information
- Process allowed discounts
- Complete payments
- Print receipts

### Products

- View products
- Create products
- Edit medicine information

The pharmacist should not normally manage employee roles or application settings.

### Inventory

- View inventory
- View batches
- Receive stock
- Adjust inventory with reason
- Record damaged products
- Record expired products
- View expiry alerts

### Purchases

- Create purchase
- Receive purchase
- View purchases

### Suppliers

- View suppliers
- Create suppliers
- Update supplier contact information

### Returns

- Process customer returns
- Approve return according to configured policy

### Reports

Access operational reports including:

- Sales summary
- Inventory
- Low stock
- Expiry
- Purchases

The pharmacist should not have access to sensitive employee administration.

---

# 7. Cashier Role

Cashier is primarily responsible for sales.

Cashier can:

### POS

- Search product
- Scan barcode
- Add item to cart
- Remove item
- Change quantity
- View selling price
- View available quantity
- Complete payment
- Print receipt

### Sales

- View own sales
- Reprint own receipts

### Inventory

Cashier can only see availability needed for selling.

Cashier cannot:

- Adjust inventory
- Receive purchases
- Create suppliers
- Change product prices
- Edit batches
- Manage employees
- Change settings
- View purchase costs
- View pharmacy-wide profit reports

---

# 8. Permission Model

Do not rely exclusively on role checks.

Implement granular permissions.

Example:

```ts
type Permission =
  | "dashboard:view"
  | "sale:create"
  | "sale:view:own"
  | "sale:view:any"
  | "sale:void"
  | "return:create"
  | "return:approve"
  | "product:view"
  | "product:create"
  | "product:update"
  | "product:archive"
  | "product:change-price"
  | "inventory:view"
  | "inventory:adjust"
  | "purchase:view"
  | "purchase:create"
  | "purchase:receive"
  | "supplier:view"
  | "supplier:create"
  | "supplier:update"
  | "report:sales"
  | "report:profit"
  | "report:inventory"
  | "user:manage"
  | "settings:manage";
```

Role permissions should be centralized on the backend.

Frontend permission checks exist only for UX.

Backend authorization is the source of truth.

---

# 9. Authentication Requirements

## Authentication Method

Users log in using:

```text
Phone Number
Password
```

No email is required.

Example:

```text
Phone: +201001234567
Password: ********
```

---

# 10. Authentication Architecture

Use custom authentication with server-managed sessions and JWT.

Recommended architecture:

```text
Phone + Password
        ↓
POST /api/auth/login
        ↓
Verify user
        ↓
Verify password using Argon2 or bcrypt
        ↓
Create Session in Database
        ↓
Create signed JWT
        ↓
Store JWT in HttpOnly cookie
        ↓
Return user information
```

The JWT should reference a server session.

Example payload:

```json
{
  "sub": "user_id",
  "sid": "session_id",
  "role": "CASHIER"
}
```

Do not store sensitive information inside the JWT.

---

# 11. Session Model

Recommended:

```ts
Session {
  id
  userId
  tokenHash
  expiresAt
  lastUsedAt
  revokedAt
  ipAddress
  userAgent
  createdAt
}
```

Every protected request should:

1. Read JWT from cookie
2. Verify signature
3. Read `sid`
4. Find session
5. Ensure session exists
6. Ensure session isn't revoked
7. Ensure user is active
8. Authorize permission

---

# 12. Authentication Cookie

Recommended production configuration:

```ts
{
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/"
}
```

Never store authentication JWTs in:

```text
localStorage
sessionStorage
```

for the primary web authentication flow.

---

# 13. Auth Endpoints

## Login

```http
POST /api/auth/login
```

Request:

```json
{
  "phone": "+201001234567",
  "password": "Password123!"
}
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "name": "Ahmed Admin",
    "phone": "+201001234567",
    "role": "ADMIN"
  }
}
```

---

## Current User

```http
GET /api/auth/me
```

---

## Logout

```http
POST /api/auth/logout
```

The server must revoke/delete the active session.

---

## Logout All Sessions

Admin or user can revoke all sessions:

```http
POST /api/auth/logout-all
```

---

# 14. User Entity

```ts
User {
  id
  name
  phone
  passwordHash
  role
  isActive
  lastLoginAt
  createdAt
  updatedAt
}
```

Constraints:

```text
phone → UNIQUE
```

Normalize phone numbers before saving.

Prefer E.164 format.

Example:

```text
+201001234567
```

---

# 15. Product Management

A product represents a medicine or pharmacy item.

Fields:

```ts
Product {
  id
  name
  genericName
  barcode
  sku
  categoryId
  manufacturerId
  strength
  dosageForm
  description
  sellingPrice
  defaultPurchasePrice
  prescriptionRequired
  minimumStock
  isActive
  createdAt
  updatedAt
}
```

Examples:

```text
Panadol Extra
Paracetamol
500 mg
Tablet
```

---

# 16. Product Categories

Example categories:

```text
Pain Relief
Antibiotics
Cold & Flu
Vitamins
Digestive
Skin Care
Personal Care
Medical Supplies
Baby Care
```

Schema:

```ts
Category {
  id
  name
  description
  isActive
}
```

---

# 17. Manufacturers

Schema:

```ts
Manufacturer {
  id
  name
  phone?
  country?
  isActive
}
```

---

# 18. Batch Management

Inventory must be batch based.

Never store only:

```ts
Product.quantity
```

Instead:

```ts
InventoryBatch {
  id
  productId
  batchNumber
  purchaseItemId?
  purchasePrice
  sellingPrice?
  initialQuantity
  availableQuantity
  manufacturingDate?
  expiryDate
  receivedAt
  status
}
```

Batch status:

```text
ACTIVE
EXPIRED
DEPLETED
DAMAGED
```

---

# 19. Batch Example

```text
Product:
Panadol Extra

Batch:
PAN-2026-001

Initial Quantity:
100

Available Quantity:
72

Purchase Price:
27 EGP

Selling Price:
35 EGP

Expiry:
2027-08-31
```

---

# 20. Expiry Rules

The system must prevent sale of expired stock.

If:

```text
expiryDate < today
```

the batch cannot be selected for a new sale.

Products nearing expiry should appear in alerts.

Default alert:

```text
30 days before expiry
```

Admin may configure this later.

---

# 21. FEFO Inventory Strategy

Use:

**First Expired, First Out**

When selling a product, consume stock from the valid batch with the earliest expiry date.

Example:

```text
Panadol

Batch A
Expiry: 2027-01
Qty: 10

Batch B
Expiry: 2027-06
Qty: 50
```

Sell from Batch A first.

---

# 22. Inventory Movements

Every inventory change must generate an inventory movement.

Schema:

```ts
InventoryMovement {
  id
  productId
  batchId
  type
  quantity
  quantityBefore
  quantityAfter
  referenceType?
  referenceId?
  reason?
  createdBy
  createdAt
}
```

Movement types:

```text
PURCHASE
SALE
SALE_RETURN
PURCHASE_RETURN
ADJUSTMENT_IN
ADJUSTMENT_OUT
DAMAGED
EXPIRED
VOID
```

Example:

```text
+100 PURCHASE
-2 SALE
-3 DAMAGED
+1 SALE_RETURN
```

Do not silently modify inventory.

---

# 23. Suppliers

Supplier fields:

```ts
Supplier {
  id
  name
  phone
  email?
  address?
  taxNumber?
  contactPerson?
  notes?
  isActive
  createdAt
  updatedAt
}
```

---

# 24. Purchases

Purchase represents stock received from a supplier.

```ts
Purchase {
  id
  purchaseNumber
  supplierId
  supplierInvoiceNumber?
  status
  subtotal
  discount
  tax
  total
  purchasedAt
  receivedAt?
  createdBy
  receivedBy?
  notes?
}
```

Statuses:

```text
DRAFT
RECEIVED
CANCELLED
```

---

# 25. Purchase Items

```ts
PurchaseItem {
  id
  purchaseId
  productId
  batchNumber
  quantity
  purchasePrice
  sellingPrice
  expiryDate
  subtotal
}
```

Receiving a purchase must create:

```text
InventoryBatch
+
InventoryMovement
```

for every purchase item.

---

# 26. POS / Cashier Screen

The POS should be optimized for speed.

Recommended layout:

```text
┌────────────────────────────────────────────────────────────┐
│ Search medicine, generic name, SKU, barcode               │
├───────────────────────────────┬────────────────────────────┤
│ Product results               │ Cart                       │
│                               │                            │
│ Panadol Extra                 │ Panadol x2      70 EGP    │
│ Cataflam 50mg                 │ Vitamin C x1    90 EGP    │
│ Augmentin 1g                  │                            │
│                               │ Subtotal        160 EGP    │
│                               │ Discount          0 EGP    │
│                               │ Tax               0 EGP    │
│                               │ Total           160 EGP    │
│                               │                            │
│                               │ [Complete Sale]            │
└───────────────────────────────┴────────────────────────────┘
```

---

# 27. POS Search

Allow search using:

- Barcode
- Product name
- Generic name
- SKU

Barcode scanning should work by focusing the main POS search input.

---

# 28. Cart Requirements

Each cart item should contain:

```ts
CartItem {
  productId
  name
  quantity
  unitPrice
  discount
  subtotal
}
```

Users should be able to:

- Increase quantity
- Decrease quantity
- Remove product
- Clear cart

Before checkout, verify inventory again on the server.

Never trust frontend inventory quantities.

---

# 29. Sale Entity

```ts
Sale {
  id
  invoiceNumber
  cashierId
  status
  subtotal
  itemDiscount
  orderDiscount
  tax
  total
  paidAmount
  changeAmount
  paymentStatus
  createdAt
}
```

Sale status:

```text
COMPLETED
PARTIALLY_RETURNED
RETURNED
VOIDED
```

---

# 30. Sale Items

```ts
SaleItem {
  id
  saleId
  productId
  productNameSnapshot
  quantity
  unitPrice
  discount
  subtotal
}
```

Product names and prices should be stored as snapshots.

Changing the product later must not change historical invoices.

---

# 31. Sale Batch Allocation

Because a sale may consume multiple batches:

```ts
SaleItemBatch {
  id
  saleItemId
  batchId
  quantity
  unitCost
}
```

Example:

Customer buys 5 units.

```text
Batch A → 2
Batch B → 3
```

---

# 32. Complete Sale Transaction

Completing a sale must happen inside a database transaction.

Pseudo-flow:

```text
BEGIN

Validate user permission

Validate cart

Lock/check required batch quantities

Create Sale

Create SaleItems

Allocate FEFO batches

Decrease batch quantities

Create InventoryMovements

Create Payment

COMMIT
```

If any operation fails:

```text
ROLLBACK
```

Never create a partially completed sale.

---

# 33. Payments

Supported MVP payment methods:

```text
CASH
CARD
MOBILE_WALLET
```

Payment schema:

```ts
Payment {
  id
  saleId
  method
  amount
  reference?
  createdAt
}
```

---

# 34. Cash Payments

For cash:

```text
Total:
150 EGP

Received:
200 EGP

Change:
50 EGP
```

Validation:

```text
received >= total
```

---

# 35. Receipt

After successful checkout, generate a printable receipt.

Receipt should contain:

```text
Pharmacy Name

Invoice #PH-2026-000123
Date: 25 Sep 2026
Cashier: Mohamed Ali

--------------------------------

Panadol Extra
2 × 35.00           70.00

Vitamin C
1 × 90.00           90.00

--------------------------------

Subtotal             160.00
Discount               0.00
Tax                    0.00

TOTAL                 160.00

Cash                  200.00
Change                 40.00

Thank you
```

Use browser print initially.

Thermal printer-specific integrations can be implemented later.

---

# 36. Returns

Return requires selecting the original sale.

User flow:

```text
Sales
↓
Select Sale
↓
Return Items
↓
Choose Quantity
↓
Enter Reason
↓
Determine Restock
↓
Confirm Refund
```

---

# 37. Return Entity

```ts
SaleReturn {
  id
  returnNumber
  saleId
  createdBy
  reason
  refundAmount
  createdAt
}
```

---

# 38. Return Items

```ts
SaleReturnItem {
  id
  returnId
  saleItemId
  productId
  quantity
  refundAmount
  restocked
}
```

Returned medicine should not automatically return to sellable inventory unless the business explicitly approves restocking according to applicable pharmacy rules and storage requirements.

---

# 39. Dashboard

Admin dashboard should display:

```text
Today's Revenue
Today's Transactions
Today's Items Sold
Estimated Gross Profit

Low Stock Products
Out-of-Stock Products
Products Expiring Soon
Expired Batches
```

Pharmacist dashboard can show:

```text
Today's Sales
Low Stock
Expiry Alerts
Pending Stock Tasks
```

Cashier dashboard can be minimal:

```text
My Sales Today
My Transactions Today
Start Selling
```

---

# 40. Reports

MVP reports:

### Sales

- Today
- Yesterday
- Custom date range
- Total sales
- Number of transactions
- Average order value

### Product Sales

- Top selling products
- Quantity sold
- Revenue

### Inventory

- Current inventory
- Stock value
- Low stock
- Out of stock

### Expiry

- Expiring in 30 days
- Expiring in 60 days
- Expiring in 90 days
- Expired

### Purchases

- Supplier
- Purchase total
- Date range

### Payments

- Cash
- Card
- Wallet

### Cashier

- Transactions by cashier
- Revenue by cashier

### Profit

For Admin:

```text
Gross Profit =
Sale Revenue - Cost of Goods Sold
```

Use actual batch purchase costs for COGS.

---

# 41. Low Stock

A product is considered low stock when:

```text
availableQuantity <= minimumStock
```

Total available stock should be calculated from valid active batches.

Example:

```text
minimumStock = 20
available = 13

status = LOW_STOCK
```

---

# 42. Audit Log

Sensitive actions should be logged.

```ts
AuditLog {
  id
  userId
  action
  entityType
  entityId
  previousData?
  newData?
  ipAddress?
  createdAt
}
```

Important actions:

```text
LOGIN
LOGOUT
CREATE_USER
UPDATE_USER_ROLE
CHANGE_PRODUCT_PRICE
ADJUST_INVENTORY
CREATE_PURCHASE
RECEIVE_PURCHASE
COMPLETE_SALE
VOID_SALE
CREATE_RETURN
CHANGE_SETTINGS
```

---

# 43. Recommended Pages

```text
/login

/dashboard

/pos

/products
/products/new
/products/:id
/products/:id/edit

/categories

/inventory
/inventory/batches
/inventory/low-stock
/inventory/expiring
/inventory/movements

/suppliers
/suppliers/:id

/purchases
/purchases/new
/purchases/:id

/sales
/sales/:id

/returns
/returns/:id

/reports
/reports/sales
/reports/inventory
/reports/expiry
/reports/purchases
/reports/payments

/users
/users/new
/users/:id

/settings
```

---

# 44. Recommended Technology Stack

## Frontend

```text
React 19
TypeScript
Vite
Tailwind CSS v4
shadcn/ui
React Router
TanStack Query
React Hook Form
Zod
```

Recommended state split:

```text
TanStack Query → server state
Zustand → POS/cart UI state if needed
```

---

# 45. Backend

```text
Node.js
Express.js
TypeScript
Prisma ORM
PostgreSQL
Zod
Argon2 or bcrypt
JWT
```

Recommended:

```text
argon2
```

for password hashing.

---

# 46. Database

Use:

```text
PostgreSQL
```

instead of MongoDB because the system depends heavily on:

- Transactions
- Relations
- Inventory consistency
- Purchase/sale relations
- Batch allocation
- Financial reporting

---

# 47. Main Database Tables

Recommended database structure:

```text
users
sessions

categories
manufacturers
products
inventory_batches
inventory_movements

suppliers

purchases
purchase_items

sales
sale_items
sale_item_batches
payments

sale_returns
sale_return_items

audit_logs

settings
```

---

# 48. API Structure

Recommended API modules:

```text
/api/auth

/api/users

/api/products
/api/categories
/api/manufacturers

/api/inventory
/api/inventory/batches
/api/inventory/movements

/api/suppliers

/api/purchases

/api/sales

/api/returns

/api/reports

/api/dashboard

/api/settings
```

---

# 49. API Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient inventory for Panadol Extra."
  }
}
```

---

# 50. Seed Data Requirements

Development database must include realistic seed data.

Seed:

```text
3 users
8 categories
5 manufacturers
3 suppliers
15–25 products
20+ inventory batches
3–5 purchases
10+ sales
15+ payments
2 returns
inventory movements
application settings
```

---

# 51. Seed Users

Passwords shown below are development-only seed credentials.

Never use them in production.

## Admin

```text
Name:
Ahmed Admin

Phone:
+201000000001

Password:
Admin@123

Role:
ADMIN
```

---

## Pharmacist

```text
Name:
Sara Pharmacist

Phone:
+201000000002

Password:
Pharmacist@123

Role:
PHARMACIST
```

---

## Cashier

```text
Name:
Mohamed Cashier

Phone:
+201000000003

Password:
Cashier@123

Role:
CASHIER
```

Seed passwords must be hashed before database insertion.

Never store plaintext passwords.

---

# 52. Seed Categories

Create:

```text
Pain Relief
Antibiotics
Cold & Flu
Vitamins & Supplements
Digestive Health
Skin Care
Personal Care
Medical Supplies
```

---

# 53. Seed Manufacturers

Example:

```text
GSK
Sanofi
Eva Pharma
Hikma
Pfizer
```

These are example development records.

---

# 54. Seed Suppliers

## Supplier 1

```text
Name:
Alex Pharma Distribution

Phone:
+2035001001

Address:
Alexandria
```

## Supplier 2

```text
Name:
Mediterranean Medical Supply

Phone:
+2035001002

Address:
Alexandria
```

## Supplier 3

```text
Name:
Delta Pharmacy Supplies

Phone:
+2035001003

Address:
Egypt
```

---

# 55. Seed Products

Example development products:

### Product 1

```text
Name:
Panadol Extra

Generic:
Paracetamol + Caffeine

Barcode:
622100000001

SKU:
MED-001

Category:
Pain Relief

Strength:
500mg / 65mg

Form:
Tablet

Selling Price:
45 EGP

Purchase Price:
35 EGP

Minimum Stock:
20
```

### Product 2

```text
Name:
Cataflam

Generic:
Diclofenac Potassium

Barcode:
622100000002

SKU:
MED-002

Category:
Pain Relief

Strength:
50mg

Form:
Tablet

Selling Price:
65 EGP

Minimum Stock:
15
```

### Product 3

```text
Name:
Augmentin

Generic:
Amoxicillin / Clavulanic Acid

Barcode:
622100000003

SKU:
MED-003

Category:
Antibiotics

Strength:
1g

Form:
Tablet

Prescription Required:
true

Selling Price:
220 EGP
```

### Product 4

```text
Name:
Vitamin C

Generic:
Ascorbic Acid

Barcode:
622100000004

SKU:
VIT-001

Category:
Vitamins & Supplements

Strength:
1000mg

Selling Price:
95 EGP
```

### Product 5

```text
Name:
Strepsils

Category:
Cold & Flu

Barcode:
622100000005

SKU:
CLD-001

Selling Price:
80 EGP
```

### Product 6

```text
Name:
Antinal

Generic:
Nifuroxazide

Category:
Digestive Health

Barcode:
622100000006

SKU:
DIG-001

Selling Price:
55 EGP
```

### Product 7

```text
Name:
Betadine

Generic:
Povidone Iodine

Category:
Medical Supplies

Barcode:
622100000007

SKU:
MEDSUP-001

Selling Price:
60 EGP
```

### Product 8

```text
Name:
Medical Face Mask

Category:
Medical Supplies

Barcode:
622100000008

SKU:
SUP-001

Selling Price:
5 EGP
```

Add additional development products until at least 15–25 exist.

---

# 56. Seed Inventory Batches

Each product should have one or more batches.

Example:

```text
Panadol Extra
Batch PAN-26001
Quantity 100
Expiry 2027-04-30
Purchase Price 35
```

```text
Panadol Extra
Batch PAN-26002
Quantity 150
Expiry 2027-09-30
Purchase Price 36
```

This allows FEFO testing.

Add special test cases:

### Near Expiry

```text
Product:
Vitamin C

Quantity:
12

Expiry:
20 days from seed date
```

### Low Stock

```text
Product:
Strepsils

Available:
5

Minimum:
15
```

### Out of Stock

```text
Product:
Medical Face Mask

Available:
0
```

### Expired Batch

Create at least one batch whose expiry is before seed execution date.

It must not be available for sale.

---

# 57. Seed Purchases

Create at least three purchases.

Example:

```text
Purchase:
PUR-2026-0001

Supplier:
Alex Pharma Distribution

Status:
RECEIVED

Items:
Panadol Extra × 100
Cataflam × 80
Vitamin C × 60

Total:
example calculated total
```

Another:

```text
PUR-2026-0002

Supplier:
Mediterranean Medical Supply

Items:
Augmentin × 40
Antinal × 70
Betadine × 40
```

All received purchases should generate inventory movement records.

---

# 58. Seed Sales

Generate at least 10 completed sales across different days.

Example:

```text
Invoice:
SAL-2026-000001

Cashier:
Mohamed Cashier

Items:
Panadol Extra × 2
Vitamin C × 1

Payment:
CASH

Total:
185 EGP
```

Another:

```text
Invoice:
SAL-2026-000002

Cashier:
Mohamed Cashier

Items:
Cataflam × 1
Strepsils × 1

Payment:
CARD
```

Another:

```text
Invoice:
SAL-2026-000003

Cashier:
Sara Pharmacist

Items:
Augmentin × 1

Payment:
MOBILE_WALLET
```

Seed sales should automatically generate corresponding inventory movements.

---

# 59. Seed Returns

Create at least two returns.

Example:

```text
Original:
SAL-2026-000001

Product:
Panadol Extra

Quantity:
1

Reason:
Incorrect item purchased

Refund:
45 EGP

Restocked:
false
```

This is useful for validating return reporting.

---

# 60. Seed Inventory Movements

Seed data must contain movements resulting from:

```text
Purchases
Sales
Return
Adjustment
Expired stock
Damaged stock
```

Do not create inventory quantities independently from movements if the application architecture derives them through transactions.

The seed logic should use shared domain/service functions where practical.

---

# 61. Seed Dashboard Expectations

After seeding, dashboard should immediately show useful data.

Example:

```text
Today's Sales:
Non-zero

Transactions:
Multiple

Low Stock:
At least 1 product

Out of Stock:
At least 1 product

Expiring Soon:
At least 1 batch

Expired:
At least 1 batch
```

This ensures all major dashboard widgets can be tested immediately.

---

# 62. Pharmacy Settings Seed

Create:

```text
Pharmacy Name:
Demo Pharmacy

Currency:
EGP

Currency Symbol:
EGP

Default Tax:
0%

Expiry Warning:
30 days

Receipt Footer:
Thank you for choosing Demo Pharmacy
```

---

# 63. Security Requirements

Minimum security requirements:

### Password Security

- Hash with Argon2 or bcrypt
- Never log passwords
- Never return password hashes
- Use strong seed passwords only for development

### Authentication

- HTTP-only cookies
- Secure cookies in production
- Server-side sessions
- Session expiration
- Logout revocation
- Rate-limit login

### Authorization

Every protected backend operation must check permissions.

Never rely solely on frontend UI hiding.

### Validation

Validate all incoming requests using Zod.

### Rate Limiting

Apply stricter rate limiting to:

```text
POST /auth/login
```

Example:

```text
5 failed attempts / 15 minutes
```

Adjust according to production needs.

### CSRF

Because authentication uses cookies, implement appropriate CSRF protection for state-changing requests.

At minimum use:

- SameSite cookie protections
- Origin checking

For stronger protection, add CSRF tokens.

---

# 64. Money Handling

Never use JavaScript floating point values as the authoritative representation of money.

Prefer either:

```text
integer minor units
```

or:

```text
PostgreSQL NUMERIC / Decimal
```

With Prisma use:

```text
Decimal
```

for prices/totals.

---

# 65. Inventory Concurrency

Two cashiers may attempt to sell the last item simultaneously.

Inventory deduction must therefore be performed transactionally and concurrency-safe.

Do not:

```text
read quantity
↓
calculate in JavaScript
↓
write later without transactional protection
```

The backend must ensure inventory cannot become negative.

---

# 66. Soft Deletion

Do not hard-delete records referenced by transactions.

For:

```text
Products
Users
Suppliers
Manufacturers
Categories
```

prefer:

```text
isActive = false
```

Historical sales must remain intact.

---

# 67. Number Generation

Generate human-readable identifiers.

Examples:

```text
SALE:
SAL-2026-000001

PURCHASE:
PUR-2026-000001

RETURN:
RET-2026-000001
```

Database UUIDs should remain the internal primary identifier.

---

# 68. Search Requirements

Product search should be responsive and support:

```text
name
genericName
barcode
SKU
```

Database indexes should exist on frequently searched fields.

Important indexes:

```text
Product.barcode
Product.sku
Product.name
User.phone
Sale.invoiceNumber
Purchase.purchaseNumber
InventoryBatch.expiryDate
InventoryBatch.productId
```

---

# 69. Pagination

All large lists should use server-side pagination.

Examples:

```http
GET /api/products?page=1&limit=20
GET /api/sales?page=1&limit=20
GET /api/inventory/movements?page=1&limit=50
```

Maximum limit should be enforced.

---

# 70. Filters

Products:

```text
Search
Category
Active
Low stock
Out of stock
```

Inventory:

```text
Product
Batch
Expiry range
Status
```

Sales:

```text
Invoice
Cashier
Date
Payment method
Status
```

Purchases:

```text
Supplier
Status
Date range
```

---

# 71. Error Cases

The application must gracefully handle:

```text
Invalid login
Inactive employee
Expired session
Insufficient inventory
Expired stock
Duplicate barcode
Duplicate phone
Product unavailable
Payment amount too small
Purchase already received
Return quantity greater than sold quantity
Sale already fully returned
Unauthorized action
```

---

# 72. Important Business Rules

### BR-001

Expired batches cannot be sold.

### BR-002

Inventory cannot become negative.

### BR-003

Completed sales cannot be directly edited.

Corrections require return/void procedures.

### BR-004

Receiving a purchase increases stock exactly once.

### BR-005

Every inventory change must create an inventory movement.

### BR-006

Historical prices must remain unchanged after product price updates.

### BR-007

Cashiers cannot modify product selling prices unless explicitly granted permission.

### BR-008

Disabled users cannot authenticate.

### BR-009

Only authorized roles can manually adjust inventory.

### BR-010

FEFO must be used when allocating sale inventory.

---

# 73. Suggested Project Architecture

Frontend:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── pos/
│   ├── products/
│   ├── inventory/
│   └── reports/
├── features/
│   ├── auth/
│   ├── sales/
│   ├── products/
│   ├── inventory/
│   ├── purchases/
│   └── users/
├── hooks/
├── lib/
├── routes/
├── schemas/
└── types/
```

Backend:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── products/
│   ├── inventory/
│   ├── suppliers/
│   ├── purchases/
│   ├── sales/
│   ├── returns/
│   ├── reports/
│   └── settings/
├── middleware/
│   ├── authenticate.ts
│   ├── authorize.ts
│   ├── error-handler.ts
│   └── rate-limit.ts
├── lib/
│   ├── prisma.ts
│   ├── jwt.ts
│   └── password.ts
├── utils/
├── config/
└── server.ts
```

Prefer feature/module-oriented organization rather than a large global controllers/services folder.

---

# 74. Service Layer

Important business logic should live in services.

Example:

```text
SaleService.completeSale()

PurchaseService.receivePurchase()

InventoryService.adjustStock()

ReturnService.createReturn()

AuthService.login()
```

Route handlers should remain thin.

---

# 75. Transaction Boundaries

Prisma `$transaction` should be used for:

```text
Completing sale
Receiving purchase
Creating return
Voiding sale
Inventory adjustment when multiple records change
```

---

# 76. MVP Acceptance Criteria

The MVP is considered complete when:

### Authentication

- User can login using phone/password
- Invalid credentials are rejected
- Sessions persist across refresh
- Logout revokes session
- Disabled users cannot login

### Roles

- Admin, Pharmacist, Cashier exist
- Backend permissions correctly restrict operations

### Products

- Products can be created/edited
- Barcode and SKU search works

### Inventory

- Inventory is batch based
- Stock quantities are accurate
- Expired batches cannot be sold
- FEFO works
- Low-stock alerts work

### Purchases

- Supplier can be selected
- Purchase items can be entered
- Receiving purchase creates inventory

### POS

- Cashier can search/scan
- Add products to cart
- Change quantity
- Checkout
- Accept payment
- Print receipt

### Sales

- Completed sale appears in history
- Inventory decreases correctly
- Payment is recorded

### Returns

- Return references original sale
- Refund quantity cannot exceed sold quantity
- Inventory action is recorded

### Reports

- Basic sales report works
- Inventory report works
- Expiry report works
- Purchase report works

### Seed

Running the seed command produces:

- Admin
- Pharmacist
- Cashier
- Products
- Categories
- Suppliers
- Batches
- Purchases
- Sales
- Payments
- Returns
- Inventory movements
- Dashboard data

without manual setup.

---

# 77. Suggested Development Order

Build features in this order:

```text
1. Project setup
2. Database schema
3. Seed infrastructure
4. Authentication
5. Authorization
6. Users
7. Product/category/manufacturer management
8. Suppliers
9. Inventory batches
10. Purchases
11. Inventory movements
12. POS
13. Sales transactions
14. Payments
15. Receipt printing
16. Returns
17. Dashboard
18. Reports
19. Audit logs
20. Security hardening
21. Testing
22. Deployment
```

---

# 78. Required Testing

## Unit Tests

Test:

```text
Password hashing
Permission checks
FEFO selection
Sale totals
Discount calculations
Stock allocation
Expiry detection
Return calculations
```

## Integration Tests

Test:

```text
Login
Complete sale
Receive purchase
Return sale item
Inventory adjustment
Role authorization
```

## Critical Concurrency Test

Create a product with:

```text
Quantity = 1
```

Send two simultaneous checkout requests.

Expected:

```text
One succeeds
One fails with insufficient stock
```

Final inventory:

```text
0
```

Never:

```text
-1
```

---

# 79. Definition of Done

A feature is considered complete only when:

- API validation is implemented
- Authentication is enforced
- Authorization is enforced
- Error handling exists
- Database constraints exist
- UI loading state exists
- UI empty state exists
- UI error state exists
- Responsive layout works
- Audit logging is included when relevant
- Tests cover critical business rules

---

# 80. Final MVP Scope

The MVP should ultimately provide:

```text
Authentication
├── Phone/password login
├── JWT-backed sessions
└── Role/permission authorization

Employees
├── Admin
├── Pharmacist
└── Cashier

Products
├── Categories
├── Manufacturers
├── Barcode
└── Pricing

Inventory
├── Batches
├── Expiry tracking
├── FEFO
├── Low stock
└── Inventory movements

Suppliers
└── Supplier management

Purchases
├── Purchase creation
└── Stock receiving

POS
├── Product search
├── Barcode
├── Cart
├── Checkout
└── Receipt

Sales
├── Sales history
├── Payments
└── Reprint receipt

Returns
└── Refund workflow

Dashboard
└── Key pharmacy metrics

Reports
├── Sales
├── Inventory
├── Expiry
├── Purchases
└── Payments

Administration
├── Users
├── Permissions
├── Settings
└── Audit logs
```

The first release should prioritize reliability of **sales, inventory, batches, purchases, and authentication** over adding additional features. Inventory accuracy and transactional consistency are critical because errors in these areas directly affect pharmacy operations.