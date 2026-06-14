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

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreatePaymentRequest {
    pub invoice_id: Uuid,
    pub amount: Decimal,
    pub method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListPaymentsQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub invoice_id: Option<Uuid>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PaymentResponse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub invoice_id: Uuid,
    pub amount: Decimal,
    pub method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub paid_at: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct PaymentListResponse {
    pub payments: Vec<PaymentResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_payments(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<ListPaymentsQuery>,
) -> Result<Json<PaymentListResponse>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let (payments, total) = if let Some(invoice_id) = params.invoice_id {
        let payments = sqlx::query_as::<_, PaymentResponse>(
            "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
             FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(invoice_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payments WHERE invoice_id = $1"
        )
        .bind(invoice_id)
        .fetch_one(&pool)
        .await?;

        (payments, total)
    } else {
        let payments = sqlx::query_as::<_, PaymentResponse>(
            "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
             FROM payments ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payments"
        )
        .fetch_one(&pool)
        .await?;

        (payments, total)
    };

    Ok(Json(PaymentListResponse { payments, total, page, per_page }))
}

async fn create_payment(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<CreatePaymentRequest>,
) -> Result<Json<PaymentResponse>, AppError> {
    let tenant_id: Uuid = claims.tenant_id.parse().map_err(|_| AppError::BadRequest("Invalid tenant".into()))?;
    let payment_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    // Verify invoice exists and belongs to tenant
    let invoice = sqlx::query_scalar::<_, (Decimal, Decimal, String)>(
        "SELECT total, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1 AND status = 'completed'), status \
         FROM invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(req.invoice_id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let (invoice_total, paid_so_far, invoice_status) = invoice;

    if invoice_status == "paid" {
        return Err(AppError::BadRequest("Invoice is already fully paid".into()));
    }

    // Check if payment would exceed invoice total
    if paid_so_far + req.amount > invoice_total {
        return Err(AppError::BadRequest(
            format!("Payment amount exceeds remaining balance. Remaining: {}", invoice_total - paid_so_far)
        ));
    }

    // Insert payment
    sqlx::query(
        "INSERT INTO payments (id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    .bind(payment_id)
    .bind(tenant_id)
    .bind(req.invoice_id)
    .bind(req.amount)
    .bind(&req.method)
    .bind(&req.reference)
    .bind(&req.notes)
    .bind("completed")
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await?;

    // Update invoice status if fully paid
    let new_total_paid = paid_so_far + req.amount;
    if new_total_paid >= invoice_total {
        sqlx::query(
            "UPDATE invoices SET status = 'paid', paid_at = $1, updated_at = $1 WHERE id = $2"
        )
        .bind(now)
        .bind(req.invoice_id)
        .execute(&pool)
        .await?;
    } else if invoice_status == "draft" {
        sqlx::query("UPDATE invoices SET status = 'partial', updated_at = $1 WHERE id = $2")
            .bind(now)
            .bind(req.invoice_id)
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
    .bind("create_payment")
    .bind("payment")
    .bind(payment_id)
    .bind(serde_json::json!({"invoice_id": req.invoice_id.to_string(), "amount": req.amount.to_string(), "method": req.method}).to_string())
    .bind(now)
    .execute(&pool)
    .await?;

    let payment = sqlx::query_as::<_, PaymentResponse>(
        "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
         FROM payments WHERE id = $1"
    )
    .bind(payment_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(payment))
}

async fn get_payment(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<PaymentResponse>, AppError> {
    let payment = sqlx::query_as::<_, PaymentResponse>(
        "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
         FROM payments WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(payment))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/payments", get(list_payments).post(create_payment))
        .route("/api/payments/{id}", get(get_payment))
}
