use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ListAuditLogsQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub user_id: Option<Uuid>,
    pub entity_type: Option<String>,
    pub action: Option<String>,
    pub from_date: Option<chrono::DateTime<chrono::Utc>>,
    pub to_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct AuditLogListResponse {
    pub logs: Vec<AuditLogResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_audit_logs(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<ListAuditLogsQuery>,
) -> Result<Json<AuditLogListResponse>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    let logs = sqlx::query_as::<_, AuditLogResponse>(
        "SELECT id, tenant_id, user_id, action, entity_type, entity_id, details, ip_address, created_at \
         FROM audit_logs WHERE ($1::uuid IS NULL OR user_id = $1) \
         AND ($2::text IS NULL OR entity_type = $2) \
         AND ($3::text IS NULL OR action = $3) \
         AND ($4::timestamptz IS NULL OR created_at >= $4) \
         AND ($5::timestamptz IS NULL OR created_at <= $5) \
         ORDER BY created_at DESC LIMIT $6 OFFSET $7"
    )
    .bind(params.user_id)
    .bind(&params.entity_type)
    .bind(&params.action)
    .bind(params.from_date)
    .bind(params.to_date)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM audit_logs WHERE ($1::uuid IS NULL OR user_id = $1) \
         AND ($2::text IS NULL OR entity_type = $2) \
         AND ($3::text IS NULL OR action = $3) \
         AND ($4::timestamptz IS NULL OR created_at >= $4) \
         AND ($5::timestamptz IS NULL OR created_at <= $5)"
    )
    .bind(params.user_id)
    .bind(&params.entity_type)
    .bind(&params.action)
    .bind(params.from_date)
    .bind(params.to_date)
    .fetch_one(&pool)
    .await?;

    Ok(Json(AuditLogListResponse { logs, total, page, per_page }))
}

async fn get_audit_log(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<AuditLogResponse>, AppError> {
    let log = sqlx::query_as::<_, AuditLogResponse>(
        "SELECT id, tenant_id, user_id, action, entity_type, entity_id, details, ip_address, created_at \
         FROM audit_logs WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(log))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/audit", get(list_audit_logs))
        .route("/api/audit/{id}", get(get_audit_log))
}
