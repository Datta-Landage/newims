# IMP Backend - API Documentation

**Base URL**: `http://localhost:3000/api/v1`

## 📏 Standard API Response
All API endpoints return a consistent JSON structure.

**Success Response**:
```json
{
  "statusCode": 200,
  "data": { ... }, // Object or Array
  "message": "Operation successful",
  "success": true
}
```

**Error Response**:
```json
{
  "statusCode": 400, // or 401, 404, 500 etc.
  "message": "Error description",
  "errors": [], // Optional validation errors
  "success": false
}
```

## 1. Authentication
*Public endpoints.*

### Login
**POST** `/auth/login`
**Body**:
```json
{ "tenantId": "...", "email": "...", "password": "..." }
```

### Refresh Token
**POST** `/auth/refresh`
**Body**:
```json
{ "refreshToken": "..." }
```

---

## 2. Master Data (System Setup)
*Requires Authentication.*

### Branch Management
**GET** `/branches` - List all branches
**POST** `/branches` - Create new branch
**PATCH** `/branches/:id` - Update branch details

### Work Area Management
**GET** `/work-areas` - List work areas
**GET** `/work-areas/:id` - Get work area details
**POST** `/work-areas` - Create work area
**PUT** `/work-areas/:id` - Update work area
**DELETE** `/work-areas/:id` - Delete work area

### Category Management
**GET** `/categories` - List categories
**POST** `/categories` - Create category

### Vendor Management
**GET** `/vendors` - List vendors
**GET** `/vendors/:id` - Get vendor details
**POST** `/vendors` - Create vendor
**PATCH** `/vendors/:id` - Update vendor
**DELETE** `/vendors/:id` - Delete vendor

### Item Management
**GET** `/items` - List items
**GET** `/items/:id` - Get item details
**POST** `/items` - Create item
**PATCH** `/items/:id` - Update item
**DELETE** `/items/:id` - Delete item

---

## 3. Procurement (Inbound)

### Purchase Orders (PO)
**GET** `/purchase-orders` - List POs (Filters: status, vendorId)
**POST** `/purchase-orders` - Create PO manually
**POST** `/purchase-orders/from-pool` - Create PO from Procurement Pool (Indents)
**PATCH** `/purchase-orders/:id` - Update PO details
**PATCH** `/purchase-orders/:id/approve` - Approve PO
**PATCH** `/purchase-orders/:id/cancel` - Cancel PO
**DELETE** `/purchase-orders/:id` - Delete PO
**PATCH** `/purchase-orders/:id/items/:itemId` - Update specific item quantity in PO

### Goods Received Note (GRN)
**GET** `/grn` - List GRNs
**POST** `/grn` - Create GRN (Increases Stock)

---

## 4. Operations (Internal)

### Indents (Internal Requests)
**GET** `/indents` - List indents
**post** `/indents` - Create indent
**GET** `/indents/procurement-pool` - List items pending for purchase (Approved Indents)
**PATCH** `/indents/:id/approve` - Approve indent
**PATCH** `/indents/:id/reject` - Reject indent
**PATCH** `/indents/:id/cancel` - Cancel indent
**POST** `/indents/issue` - Issue stock against indent (Decreases Stock)

### Inventory
**GET** `/inventory` - List current stock
**POST** `/inventory/adjust` - Manual stock adjustment

### Returns (RTV)
**GET** `/rtv` - List Returns to Vendor
**POST** `/rtv` - Create RTV (Decreases Stock)

### Special Orders
**GET** `/special-orders` - List special orders
**POST** `/special-orders` - Create special order
**PATCH** `/special-orders/:id/approve` - Approve special order
**PATCH** `/special-orders/:id/close` - Close special order

---

## 5. Administration

### User Management
**GET** `/users` - List users
**GET** `/users/:id` - Get user details
**POST** `/users` - Create user
**PATCH** `/users/:id` - Update user
**DELETE** `/users/:id` - Delete user

### Roles & Permissions
**GET** `/roles` - List roles
**GET** `/roles/:id` - Get role details
**PUT** `/roles/:id/permissions` - Update role permissions
**GET** `/permissions` - List all available permissions

### Audit Logs
**GET** `/audit-logs` - View system audit logs

### Profile
**GET** `/profile/me` - Get current user profile
**PUT** `/profile/change-password` - Change password

---

## 6. Dashboard & Reports

### Dashboard
**GET** `/dashboard/stats` - Get key statistics

### Reports
**GET** `/reports/live-stock` - Current Stock Report
**GET** `/reports/indent-issue` - Indent vs Issue Report
**GET** `/reports/purchase-indent-consolidated` - Purchase vs Indent
**GET** `/reports/po-status` - PO Status Report
**GET** `/reports/rate-variance` - Rate Variance Report
**GET** `/reports/manual-closing` - Manual Closing Report
**GET** `/reports/invoice-summary` - Invoice Summary
**GET** `/reports/store-variance` - Store Variance
**GET** `/reports/detailed-grn` - Detailed GRN Report
**GET** `/reports/flr` - Food & Liquor Ratio (FLR)
**GET** `/reports/supplier-item-purchase` - Supplier Item Purchase
**GET** `/reports/supplier-purchase` - Supplier Purchase Summary
