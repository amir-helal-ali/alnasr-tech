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
use crate::middleware::Claims;

// ── Types ───────────────────────────────────────────────────────────────

const VALID_PAYMENT_METHODS: &[&str] = &["cash", "bank_transfer", "credit_card", "debit_card", "check", "other"];

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreatePaymentRequest {
    pub invoice_id: Uuid,
    pub amount: Decimal,
    #[validate(length(min = 1, message = "Payment method is required"))]
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

/// Validate request and return early if validation fails.
fn validate_request<T: validator::Validate>(req: &T) -> Result<(), AppError> {
    req.validate().map_err(AppError::from)
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_payments(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Query(params): Query<ListPaymentsQuery>,
) -> Result<Json<PaymentListResponse>, AppError> {
    let tenant_id = claims.tenant_uuid()?;
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let (payments, total) = if let Some(invoice_id) = params.invoice_id {
        let payments = sqlx::query_as::<_, PaymentResponse>(
            "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
             FROM payments WHERE tenant_id = $1 AND invoice_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        )
        .bind(tenant_id)
        .bind(invoice_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payments WHERE tenant_id = $1 AND invoice_id = $2"
        )
        .bind(tenant_id)
        .bind(invoice_id)
        .fetch_one(&pool)
        .await?;

        (payments, total)
    } else {
        let payments = sqlx::query_as::<_, PaymentResponse>(
            "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
             FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(tenant_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM payments WHERE tenant_id = $1"
        )
        .bind(tenant_id)
        .fetch_one(&pool)
        .await?;

        (payments, total)
    };

    Ok(Json(PaymentListResponse { payments, total, page, per_page }))
}

async fn create_payment(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<CreatePaymentRequest>,
) -> Result<Json<PaymentResponse>, AppError> {
    validate_request(&req)?;

    // Validate payment method
    if !VALID_PAYMENT_METHODS.contains(&req.method.as_str()) {
        return Err(AppError::BadRequest(
            format!("Invalid payment method '{}'. Valid methods: {}", req.method, VALID_PAYMENT_METHODS.join(", "))
        ));
    }

    // Validate amount
    if req.amount <= Decimal::ZERO {
        return Err(AppError::BadRequest("Payment amount must be positive".into()));
    }

    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let payment_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;
    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    // Verify invoice exists and belongs to tenant with row lock
    let invoice = sqlx::query_as::<_, (Decimal, Decimal, String)>(
        "SELECT total, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1 AND status = 'completed'), status \
         FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE"
    )
    .bind(req.invoice_id)
    .bind(tenant_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let (invoice_total, paid_so_far, invoice_status) = invoice;

    if invoice_status == "paid" {
        return Err(AppError::BadRequest("Invoice is already fully paid".into()));
    }

    if invoice_status == "cancelled" {
        return Err(AppError::BadRequest("Cannot add payments to a cancelled invoice".into()));
    }

    if invoice_status == "draft" {
        return Err(AppError::BadRequest("Invoice must be issued before payments can be recorded".into()));
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
    .execute(&mut *tx)
    .await?;

    // Update invoice status if fully paid
    let new_total_paid = paid_so_far + req.amount;
    if new_total_paid >= invoice_total {
        sqlx::query(
            "UPDATE invoices SET status = 'paid', paid_at = $1, updated_at = $1 WHERE id = $2"
        )
        .bind(now)
        .bind(req.invoice_id)
        .execute(&mut *tx)
        .await?;
    } else {
        sqlx::query("UPDATE invoices SET status = 'partial', updated_at = $1 WHERE id = $2")
            .bind(now)
            .bind(req.invoice_id)
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
    .bind("create_payment")
    .bind("payment")
    .bind(payment_id)
    .bind(serde_json::json!({"invoice_id": req.invoice_id.to_string(), "amount": req.amount.to_string(), "method": req.method}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

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
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<PaymentResponse>, AppError> {
    let tenant_id = claims.tenant_uuid()?;

    let payment = sqlx::query_as::<_, PaymentResponse>(
        "SELECT id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at \
         FROM payments WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
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
