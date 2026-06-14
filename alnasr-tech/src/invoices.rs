use axum::{
    extract::{Path, Query, State},
    routing::{get, patch},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;
use crate::tax;

// ── Types ───────────────────────────────────────────────────────────────

/// Valid invoice statuses for state machine transitions.
const VALID_STATUSES: &[&str] = &["draft", "issued", "submitted", "accepted", "partial", "paid", "cancelled"];

/// Valid transitions from each status.
pub fn valid_transitions(current: &str) -> &[&str] {
    match current {
        "draft" => &["issued", "cancelled"],
        "issued" => &["submitted", "cancelled"],
        "submitted" => &["accepted", "cancelled"],
        "accepted" => &["paid", "cancelled"],
        "partial" => &["paid", "cancelled"],
        "paid" => &[],
        "cancelled" => &[],
        _ => &[],
    }
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateInvoiceRequest {
    pub customer_id: Uuid,
    #[validate(length(min = 1, message = "Invoice must have at least one line item"))]
    pub items: Vec<InvoiceLineItemRequest>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, validator::Validate)]
pub struct InvoiceLineItemRequest {
    #[validate(length(min = 1, message = "Description is required"))]
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub tax_rate: Option<Decimal>,
}

#[derive(Debug, Deserialize)]
pub struct ListInvoicesQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct InvoiceLineItem {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub tax_rate: Decimal,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub total: Decimal,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct InvoiceResponse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub invoice_number: String,
    pub customer_id: Uuid,
    pub status: String,
    pub subtotal: Decimal,
    pub tax_total: Decimal,
    pub total: Decimal,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub notes: Option<String>,
    pub issued_at: chrono::DateTime<chrono::Utc>,
    pub paid_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceDetailResponse {
    #[serde(flatten)]
    pub invoice: InvoiceResponse,
    pub items: Vec<InvoiceLineItem>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceListResponse {
    pub invoices: Vec<InvoiceResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

/// Validate request and return early if validation fails.
fn validate_request<T: validator::Validate>(req: &T) -> Result<(), AppError> {
    req.validate().map_err(AppError::from)
}

/// Validate line item amounts.
fn validate_line_items(items: &[InvoiceLineItemRequest]) -> Result<(), AppError> {
    for item in items {
        if item.quantity <= Decimal::ZERO {
            return Err(AppError::BadRequest("Quantity must be positive".into()));
        }
        if item.unit_price < Decimal::ZERO {
            return Err(AppError::BadRequest("Unit price cannot be negative".into()));
        }
        if let Some(rate) = item.tax_rate {
            if rate < Decimal::ZERO || rate > Decimal::new(100, 0) {
                return Err(AppError::BadRequest("Tax rate must be between 0 and 100".into()));
            }
        }
    }
    Ok(())
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_invoices(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Query(params): Query<ListInvoicesQuery>,
) -> Result<Json<InvoiceListResponse>, AppError> {
    let tenant_id = claims.tenant_uuid()?;
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let mut query_str = String::from(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE tenant_id = $1"
    );
    let mut count_str = String::from("SELECT COUNT(*) FROM invoices WHERE tenant_id = $1");

    let mut bind_idx = 2u32;

    if params.status.is_some() {
        query_str.push_str(&format!(" AND status = ${bind_idx}"));
        count_str.push_str(&format!(" AND status = ${bind_idx}"));
        bind_idx += 1;
    }
    if params.customer_id.is_some() {
        query_str.push_str(&format!(" AND customer_id = ${bind_idx}"));
        count_str.push_str(&format!(" AND customer_id = ${bind_idx}"));
        bind_idx += 1;
    }

    query_str.push_str(&format!(" ORDER BY created_at DESC LIMIT ${bind_idx} OFFSET ${}", bind_idx + 1));

    let mut q = sqlx::query_as::<_, InvoiceResponse>(&query_str);
    let mut cq = sqlx::query_scalar::<_, i64>(&count_str);

    q = q.bind(tenant_id);
    cq = cq.bind(tenant_id);

    if let Some(ref status) = params.status {
        q = q.bind(status);
        cq = cq.bind(status);
    }
    if let Some(cid) = params.customer_id {
        q = q.bind(cid);
        cq = cq.bind(cid);
    }

    q = q.bind(per_page).bind(offset);

    let invoices = q.fetch_all(&pool).await?;
    let total = cq.fetch_one(&pool).await?;

    Ok(Json(InvoiceListResponse { invoices, total, page, per_page }))
}

async fn create_invoice(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<CreateInvoiceRequest>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    validate_request(&req)?;
    validate_line_items(&req.items)?;

    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let invoice_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;
    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    // Verify customer belongs to this tenant
    let customer_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM customers WHERE id = $1 AND tenant_id = $2 AND is_active = true"
    )
    .bind(req.customer_id)
    .bind(tenant_id)
    .fetch_one(&mut *tx)
    .await?;

    if customer_exists == 0 {
        return Err(AppError::BadRequest("Customer not found or does not belong to your organization".into()));
    }

    // Generate invoice number: INV-YYYYMMDD-XXXX
    let date_str = now.format("%Y%m%d");
    let seq: (i64,) = sqlx::query_as("SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 14 FOR 4) AS INTEGER)), 0) + 1 FROM invoices WHERE tenant_id = $1 AND invoice_number LIKE $2")
        .bind(tenant_id)
        .bind(format!("INV-{date_str}-%"))
        .fetch_one(&mut *tx)
        .await?;
    let invoice_number = format!("INV-{date_str}-{:04}", seq.0);

    // Calculate totals using deterministic tax engine
    let mut subtotal = Decimal::ZERO;
    let mut tax_total = Decimal::ZERO;
    let default_vat = Decimal::from_str_exact(tax::VAT_RATE_STR).unwrap_or(Decimal::from(14));

    let mut line_items: Vec<InvoiceLineItem> = Vec::new();

    for item_req in &req.items {
        let tax_rate = item_req.tax_rate.unwrap_or(default_vat) / Decimal::from(100);
        let line_subtotal = item_req.quantity * item_req.unit_price;
        let line_tax = tax::calculate_line_tax(line_subtotal, tax_rate);
        let line_total = line_subtotal + line_tax;

        subtotal += line_subtotal;
        tax_total += line_tax;

        line_items.push(InvoiceLineItem {
            id: Uuid::new_v4(),
            invoice_id,
            description: item_req.description.clone(),
            quantity: item_req.quantity,
            unit_price: item_req.unit_price,
            tax_rate: item_req.tax_rate.unwrap_or(default_vat),
            subtotal: line_subtotal,
            tax_amount: line_tax,
            total: line_total,
        });
    }

    let total = subtotal + tax_total;

    // Insert invoice
    sqlx::query(
        "INSERT INTO invoices (id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"
    )
    .bind(invoice_id)
    .bind(tenant_id)
    .bind(&invoice_number)
    .bind(req.customer_id)
    .bind("draft")
    .bind(subtotal)
    .bind(tax_total)
    .bind(total)
    .bind(req.due_date)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    // Insert line items
    for item in &line_items {
        sqlx::query(
            "INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(item.id)
        .bind(item.invoice_id)
        .bind(&item.description)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.tax_rate)
        .bind(item.subtotal)
        .bind(item.tax_amount)
        .bind(item.total)
        .execute(&mut *tx)
        .await?;
    }

    // Audit
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind("create_invoice")
    .bind("invoice")
    .bind(invoice_id)
    .bind(serde_json::json!({"invoice_number": invoice_number, "total": total.to_string()}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let invoice = sqlx::query_as::<_, InvoiceResponse>(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE id = $1"
    )
    .bind(invoice_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(InvoiceDetailResponse { invoice, items: line_items }))
}

async fn get_invoice(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    let tenant_id = claims.tenant_uuid()?;

    let invoice = sqlx::query_as::<_, InvoiceResponse>(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let items = sqlx::query_as::<_, InvoiceLineItem>(
        "SELECT id, invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total \
         FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id"
    )
    .bind(id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(InvoiceDetailResponse { invoice, items }))
}

async fn update_invoice(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateInvoiceRequest>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    validate_request(&req)?;
    validate_line_items(&req.items)?;

    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;
    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    // Verify invoice is in draft status and belongs to tenant
    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if current != "draft" {
        return Err(AppError::BadRequest("Only draft invoices can be updated".into()));
    }

    // Verify customer belongs to this tenant
    let customer_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM customers WHERE id = $1 AND tenant_id = $2 AND is_active = true"
    )
    .bind(req.customer_id)
    .bind(tenant_id)
    .fetch_one(&mut *tx)
    .await?;

    if customer_exists == 0 {
        return Err(AppError::BadRequest("Customer not found or does not belong to your organization".into()));
    }

    // Recalculate totals
    let default_vat = Decimal::from_str_exact(tax::VAT_RATE_STR).unwrap_or(Decimal::from(14));
    let mut subtotal = Decimal::ZERO;
    let mut tax_total = Decimal::ZERO;
    let mut line_items: Vec<InvoiceLineItem> = Vec::new();

    for item_req in &req.items {
        let tax_rate = item_req.tax_rate.unwrap_or(default_vat) / Decimal::from(100);
        let line_subtotal = item_req.quantity * item_req.unit_price;
        let line_tax = tax::calculate_line_tax(line_subtotal, tax_rate);
        let line_total = line_subtotal + line_tax;

        subtotal += line_subtotal;
        tax_total += line_tax;

        line_items.push(InvoiceLineItem {
            id: Uuid::new_v4(),
            invoice_id: id,
            description: item_req.description.clone(),
            quantity: item_req.quantity,
            unit_price: item_req.unit_price,
            tax_rate: item_req.tax_rate.unwrap_or(default_vat),
            subtotal: line_subtotal,
            tax_amount: line_tax,
            total: line_total,
        });
    }

    let total = subtotal + tax_total;

    // Update invoice
    sqlx::query(
        "UPDATE invoices SET customer_id = $1, subtotal = $2, tax_total = $3, total = $4, \
         due_date = $5, notes = $6, updated_at = $7 WHERE id = $8"
    )
    .bind(req.customer_id)
    .bind(subtotal)
    .bind(tax_total)
    .bind(total)
    .bind(req.due_date)
    .bind(&req.notes)
    .bind(now)
    .bind(id)
    .execute(&mut *tx)
    .await?;

    // Delete old items and insert new ones
    sqlx::query("DELETE FROM invoice_line_items WHERE invoice_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    for item in &line_items {
        sqlx::query(
            "INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(item.id)
        .bind(item.invoice_id)
        .bind(&item.description)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.tax_rate)
        .bind(item.subtotal)
        .bind(item.tax_amount)
        .bind(item.total)
        .execute(&mut *tx)
        .await?;
    }

    // Audit
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind("update_invoice")
    .bind("invoice")
    .bind(id)
    .bind("{\"action\": \"updated_line_items\"}")
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let invoice = sqlx::query_as::<_, InvoiceResponse>(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(InvoiceDetailResponse { invoice, items: line_items }))
}

/// Update invoice status with state machine validation.
async fn update_invoice_status(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInvoiceStatusRequest>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    // Validate target status
    if !VALID_STATUSES.contains(&req.status.as_str()) {
        return Err(AppError::BadRequest(
            format!("Invalid status '{}'. Valid statuses: {}", req.status, VALID_STATUSES.join(", "))
        ));
    }

    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;
    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    // Validate transition
    let allowed = valid_transitions(&current);
    if !allowed.contains(&req.status.as_str()) {
        return Err(AppError::BadRequest(
            format!("Cannot transition invoice from '{}' to '{}'. Allowed transitions: {}", current, req.status, allowed.join(", "))
        ));
    }

    // If issuing, set issued_at if not already set
    let issued_at_update = if req.status == "issued" && current == "draft" {
        ", issued_at = COALESCE(issued_at, $3)"
    } else {
        ""
    };

    let query_str = format!(
        "UPDATE invoices SET status = $1, updated_at = $2{issued_at_update} WHERE id = $4"
    );

    let mut q = sqlx::query(&query_str)
        .bind(&req.status)
        .bind(now);

    if req.status == "issued" && current == "draft" {
        q = q.bind(now);
    }

    q = q.bind(id);
    q.execute(&mut *tx).await?;

    // Audit
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind(format!("invoice_status_{}", req.status))
    .bind("invoice")
    .bind(id)
    .bind(serde_json::json!({"from": current, "to": req.status}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let invoice = sqlx::query_as::<_, InvoiceResponse>(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    let items = sqlx::query_as::<_, InvoiceLineItem>(
        "SELECT id, invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total \
         FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id"
    )
    .bind(id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(InvoiceDetailResponse { invoice, items }))
}

async fn delete_invoice(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;
    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if current != "draft" {
        return Err(AppError::BadRequest("Only draft invoices can be deleted".into()));
    }

    // Delete line items first (cascade should handle this, but be explicit)
    sqlx::query("DELETE FROM invoice_line_items WHERE invoice_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM invoices WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Audit
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind("delete_invoice")
    .bind("invoice")
    .bind(id)
    .bind("{\"action\": \"hard_delete\"}")
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "message": "Invoice deleted" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/invoices", get(list_invoices).post(create_invoice))
        .route("/api/invoices/{id}", get(get_invoice).put(update_invoice).delete(delete_invoice))
        .route("/api/invoices/{id}/status", patch(update_invoice_status))
}
