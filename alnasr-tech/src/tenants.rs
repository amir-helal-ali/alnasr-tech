use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateTenantRequest {
    #[validate(length(min = 2))]
    pub name: String,
    pub plan: Option<String>,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTenantRequest {
    pub name: Option<String>,
    pub plan: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListTenantsQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TenantResponse {
    pub id: Uuid,
    pub name: String,
    pub plan: String,
    pub settings: Option<serde_json::Value>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct TenantListResponse {
    pub tenants: Vec<TenantResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_tenants(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<ListTenantsQuery>,
) -> Result<Json<TenantListResponse>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let tenants = sqlx::query_as::<_, TenantResponse>(
        "SELECT id, name, plan, settings, is_active, created_at, updated_at \
         FROM tenants WHERE ($1::bool IS NULL OR is_active = $1) \
         ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(params.is_active)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM tenants WHERE ($1::bool IS NULL OR is_active = $1)"
    )
    .bind(params.is_active)
    .fetch_one(&pool)
    .await?;

    Ok(Json(TenantListResponse { tenants, total, page, per_page }))
}

async fn create_tenant(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<CreateTenantRequest>,
) -> Result<Json<TenantResponse>, AppError> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let plan = req.plan.unwrap_or_else(|| "free".to_string());

    sqlx::query(
        "INSERT INTO tenants (id, name, plan, settings, is_active, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(id)
    .bind(&req.name)
    .bind(&plan)
    .bind(&req.settings)
    .bind(true)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await?;

    // Enable RLS policy for this tenant
    sqlx::query(&format!(
        "CREATE POLICY tenant_isolation_{id} ON ALL TABLES IN SCHEMA public USING (tenant_id = '{id}')"
    ))
    .execute(&pool)
    .await
    .ok(); // Policy may already exist

    Ok(Json(TenantResponse {
        id,
        name: req.name,
        plan,
        settings: req.settings,
        is_active: true,
        created_at: now,
        updated_at: now,
    }))
}

async fn get_tenant(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<TenantResponse>, AppError> {
    let tenant = sqlx::query_as::<_, TenantResponse>(
        "SELECT id, name, plan, settings, is_active, created_at, updated_at FROM tenants WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(tenant))
}

async fn update_tenant(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTenantRequest>,
) -> Result<Json<TenantResponse>, AppError> {
    let now = chrono::Utc::now();

    sqlx::query(
        "UPDATE tenants SET name = COALESCE($1, name), plan = COALESCE($2, plan), \
         settings = COALESCE($3, settings), is_active = COALESCE($4, is_active), updated_at = $5 WHERE id = $6"
    )
    .bind(&req.name)
    .bind(&req.plan)
    .bind(&req.settings)
    .bind(req.is_active)
    .bind(now)
    .bind(id)
    .execute(&pool)
    .await?;

    let tenant = sqlx::query_as::<_, TenantResponse>(
        "SELECT id, name, plan, settings, is_active, created_at, updated_at FROM tenants WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(tenant))
}

async fn delete_tenant(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query("UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(Json(serde_json::json!({ "message": "Tenant deactivated" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/tenants", get(list_tenants).post(create_tenant))
        .route("/api/tenants/{id}", get(get_tenant).put(update_tenant).delete(delete_tenant))
}
