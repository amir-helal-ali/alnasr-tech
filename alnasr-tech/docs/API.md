# Al-Nasr Tech ERP + E-Invoicing API Documentation

## Base URL
```
Production: https://api.alnasr-tech.com
Development: http://localhost:3000
```

## Authentication
All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Tokens are obtained via `/api/auth/login` or `/api/auth/register` and expire after 1 hour.
Use `/api/auth/refresh` to obtain a new token using your refresh token.

---

## Public Endpoints (No Auth Required)

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@alnasr.tech",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "dGhpcyBpcyBh...",
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@alnasr.tech",
    "role": "admin",
    "tenant_id": "uuid"
  }
}
```

### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "name": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "password": "secure_password",
  "tenant_name": "My Company"
}
```

### POST /api/auth/refresh
Refresh an expired access token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBh..."
}
```

### GET /health
Health check endpoint (returns DB connectivity status).

### GET /metrics
Prometheus metrics endpoint.

---

## Protected Endpoints (Auth Required)

### Customers `/api/customers`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/customers | List customers (paginated) |
| GET | /api/customers/:id | Get customer by ID |
| POST | /api/customers | Create customer |
| PUT | /api/customers/:id | Update customer |
| DELETE | /api/customers/:id | Soft-delete customer |

**Query Parameters (GET /api/customers):**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by name/email/phone (ILIKE)

**Create/Update Customer Body:**
```json
{
  "name": "شركة النيل للتجارة",
  "name_ar": "شركة النيل للتجارة",
  "email": "info@nile-trade.com",
  "phone": "+201012345678",
  "address": "القاهرة، مصر",
  "tax_number": "123456789"
}
```

### Invoices `/api/invoices`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/invoices | List invoices (paginated, filterable) |
| GET | /api/invoices/:id | Get invoice with line items |
| POST | /api/invoices | Create invoice |
| PUT | /api/invoices/:id | Update invoice |
| DELETE | /api/invoices/:id | Delete draft invoice |

**Invoice Status Lifecycle:**
```
draft → issued → submitted → accepted → paid
  ↓         ↓         ↓
cancelled cancelled cancelled
```

**Create Invoice Body:**
```json
{
  "customer_id": "uuid",
  "issue_date": "2026-06-14",
  "due_date": "2026-07-14",
  "notes": "Payment due within 30 days",
  "line_items": [
    {
      "description": "استشارات فنية",
      "quantity": 10,
      "unit_price": "100.00",
      "tax_rate": "14.00"
    }
  ]
}
```

**Tax Calculation (Egyptian VAT 14%):**
- `line_tax = quantity × unit_price × (tax_rate / 100)`
- `line_total = (quantity × unit_price) + line_tax`
- `subtotal = Σ(quantity × unit_price)`
- `tax_total = Σ(line_tax)`
- `grand_total = subtotal + tax_total`

### Payments `/api/payments`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/payments | List payments |
| POST | /api/payments | Record a payment |

**Payment Methods:** `cash`, `bank_transfer`, `credit_card`, `check`

**Create Payment Body:**
```json
{
  "invoice_id": "uuid",
  "amount": "1140.00",
  "method": "bank_transfer",
  "reference": "TXN-2026-001",
  "notes": "Full payment",
  "paid_at": "2026-06-14T10:30:00Z"
}
```

### E-Invoicing `/api/einvoicing`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/einvoicing/token | Get current ETA token |
| POST | /api/einvoicing/submit | Submit invoice to ETA |
| GET | /api/einvoicing/status/:id | Check submission status |

**Submit Invoice Body:**
```json
{
  "invoice_id": "uuid"
}
```

The system automatically:
1. Generates the ETA-compliant JSON document
2. Signs it with RSA-SHA256
3. Submits to the Egyptian Tax Authority API
4. Tracks submission status

### Analytics `/api/analytics`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/dashboard | Dashboard statistics |
| GET | /api/analytics/revenue | Revenue by month |
| GET | /api/analytics/trends | Revenue trends |

### Audit Log `/api/audit`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/audit | Query audit logs (paginated) |

---

## Admin-Only Endpoints (Auth + Admin Role)

### Users `/api/users`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users | List users |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |

### Tenants `/api/tenants`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tenants | List tenants |
| POST | /api/tenants | Create tenant |
| PUT | /api/tenants/:id | Update tenant |

---

## Error Responses

All errors follow a consistent format:
```json
{
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | BAD_REQUEST | Validation error or invalid input |
| 401 | UNAUTHORIZED | Missing or invalid JWT token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL | Server error |

---

## Multi-Tenant Isolation

All tenant-scoped data is isolated using PostgreSQL Row Level Security (RLS):
- Each request sets `app.current_tenant_id` and `app.current_user_id` session variables
- RLS policies on all tenant-owned tables enforce: `tenant_id = current_setting('app.current_tenant_id')::uuid`
- This ensures complete data isolation between tenants at the database level

## Rate Limiting

- 100 requests per minute per IP address
- Token bucket algorithm with automatic eviction
- Returns 429 status code when limit exceeded
