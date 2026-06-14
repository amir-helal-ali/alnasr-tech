use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::error::AppError;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct DateRangeQuery {
    pub from_date: Option<chrono::DateTime<chrono::Utc>>,
    pub to_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub total_revenue: Decimal,
    pub total_invoices: i64,
    pub paid_invoices: i64,
    pub pending_invoices: i64,
    pub overdue_invoices: i64,
    pub total_customers: i64,
    pub total_payments: i64,
    pub average_invoice_value: Decimal,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct RevenueByMonth {
    pub month: String,
    pub revenue: Decimal,
    pub invoice_count: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TrendDataPoint {
    pub period: String,
    pub invoices: i64,
    pub revenue: Decimal,
    pub payments: Decimal,
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn dashboard_handler(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
) -> Result<Json<DashboardResponse>, AppError> {
    let total_revenue: Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status IN ('paid', 'partial')"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Decimal::ZERO);

    let total_invoices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let paid_invoices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices WHERE status = 'paid'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let pending_invoices: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE status IN ('draft', 'issued', 'partial')"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let overdue_invoices: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE status NOT IN ('paid', 'cancelled') AND due_date < NOW()"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let total_customers: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers WHERE is_active = true")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_payments: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM payments WHERE status = 'completed'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let average_invoice_value: Decimal = if total_invoices > 0 {
        total_revenue / Decimal::from(total_invoices)
    } else {
        Decimal::ZERO
    };

    Ok(Json(DashboardResponse {
        total_revenue,
        total_invoices,
        paid_invoices,
        pending_invoices,
        overdue_invoices,
        total_customers,
        total_payments,
        average_invoice_value,
    }))
}

async fn revenue_handler(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<DateRangeQuery>,
) -> Result<Json<Vec<RevenueByMonth>>, AppError> {
    let revenue = sqlx::query_as::<_, RevenueByMonth>(
        "SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, \
         COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS invoice_count \
         FROM invoices \
         WHERE ($1::timestamptz IS NULL OR created_at >= $1) \
         AND ($2::timestamptz IS NULL OR created_at <= $2) \
         AND status IN ('paid', 'partial') \
         GROUP BY TO_CHAR(created_at, 'YYYY-MM') \
         ORDER BY month DESC"
    )
    .bind(params.from_date)
    .bind(params.to_date)
    .fetch_all(&pool)
    .await?;

    Ok(Json(revenue))
}

async fn trends_handler(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<DateRangeQuery>,
) -> Result<Json<Vec<TrendDataPoint>>, AppError> {
    let trends = sqlx::query_as::<_, TrendDataPoint>(
        "SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS period, \
         COALESCE(i.cnt, 0) AS invoices, \
         COALESCE(i.rev, 0) AS revenue, \
         COALESCE(p.paid, 0) AS payments \
         FROM generate_series( \
           COALESCE($1::timestamptz, NOW() - INTERVAL '30 days'), \
           COALESCE($2::timestamptz, NOW()), \
           INTERVAL '1 day' \
         ) AS d(day) \
         LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS cnt, COALESCE(SUM(total), 0) AS rev FROM invoices GROUP BY day) i ON i.day = d.day::date \
         LEFT JOIN (SELECT paid_at::date AS day, COALESCE(SUM(amount), 0) AS paid FROM payments WHERE status = 'completed' GROUP BY day) p ON p.day = d.day::date \
         ORDER BY period DESC"
    )
    .bind(params.from_date)
    .bind(params.to_date)
    .fetch_all(&pool)
    .await?;

    Ok(Json(trends))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/analytics/dashboard", get(dashboard_handler))
        .route("/api/analytics/revenue", get(revenue_handler))
        .route("/api/analytics/trends", get(trends_handler))
}
