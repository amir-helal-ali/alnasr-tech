use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::tax;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateInvoiceRequest {
    pub customer_id: Uuid,
    pub items: Vec<InvoiceLineItemRequest>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct InvoiceLineItemRequest {
    #[validate(length(min = 1))]
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

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_invoices(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<ListInvoicesQuery>,
) -> Result<Json<InvoiceListResponse>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let mut query_str = String::from(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE 1=1"
    );
    let mut count_str = String::from("SELECT COUNT(*) FROM invoices WHERE 1=1");

    let mut bind_idx = 1u32;

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
    claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<CreateInvoiceRequest>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    let tenant_id: Uuid = claims.tenant_id.parse().map_err(|_| AppError::BadRequest("Invalid tenant".into()))?;
    let invoice_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    // Generate invoice number: INV-YYYYMMDD-XXXX
    let date_str = now.format("%Y%m%d");
    let seq: (i64,) = sqlx::query_as("SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 14 FOR 4) AS INTEGER)), 0) + 1 FROM invoices WHERE tenant_id = $1 AND invoice_number LIKE $2")
        .bind(tenant_id)
        .bind(format!("INV-{date_str}-%"))
        .fetch_one(&pool)
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
    .execute(&pool)
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
        .execute(&pool)
        .await?;
    }

    // Audit
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
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
    .execute(&pool)
    .await?;

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
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    let invoice = sqlx::query_as::<_, InvoiceResponse>(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE id = $1"
    )
    .bind(id)
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
    claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateInvoiceRequest>,
) -> Result<Json<InvoiceDetailResponse>, AppError> {
    let now = chrono::Utc::now();

    // Verify invoice is in draft status
    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM invoices WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if current != "draft" {
        return Err(AppError::BadRequest("Only draft invoices can be updated".into()));
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
    .execute(&pool)
    .await?;

    // Delete old items and insert new ones
    sqlx::query("DELETE FROM invoice_line_items WHERE invoice_id = $1")
        .bind(id)
        .execute(&pool)
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
        .execute(&pool)
        .await?;
    }

    // Audit
    let tenant_id: Uuid = claims.tenant_id.parse().unwrap_or_else(|_| Uuid::nil());
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
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
    .execute(&pool)
    .await?;

    let invoice = sqlx::query_as::<_, InvoiceResponse>(
        "SELECT id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, \
         due_date, notes, issued_at, paid_at, created_at, updated_at FROM invoices WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(InvoiceDetailResponse { invoice, items: line_items }))
}

async fn delete_invoice(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM invoices WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if current != "draft" {
        return Err(AppError::BadRequest("Only draft invoices can be deleted".into()));
    }

    sqlx::query("DELETE FROM invoice_line_items WHERE invoice_id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    sqlx::query("DELETE FROM invoices WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    // Audit
    let tenant_id: Uuid = claims.tenant_id.parse().unwrap_or_else(|_| Uuid::nil());
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
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
    .bind(chrono::Utc::now())
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({ "message": "Invoice deleted" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/invoices", get(list_invoices).post(create_invoice))
        .route("/api/invoices/{id}", get(get_invoice).put(update_invoice).delete(delete_invoice))
}
