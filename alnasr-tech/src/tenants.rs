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

const VALID_PLANS: &[&str] = &["free", "starter", "professional", "enterprise"];

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateTenantRequest {
    #[validate(length(min = 2, message = "Name must be at least 2 characters"))]
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

/// Validate request and return early if validation fails.
fn validate_request<T: validator::Validate>(req: &T) -> Result<(), AppError> {
    req.validate().map_err(AppError::from)
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_tenants(
    State(pool): State<PgPool>,
    _claims: axum::Extension<Claims>,
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
    claims: axum::Extension<Claims>,
    Json(req): Json<CreateTenantRequest>,
) -> Result<Json<TenantResponse>, AppError> {
    validate_request(&req)?;

    let plan = req.plan.unwrap_or_else(|| "free".to_string());
    if !VALID_PLANS.contains(&plan.as_str()) {
        return Err(AppError::BadRequest(
            format!("Invalid plan '{}'. Valid plans: {}", plan, VALID_PLANS.join(", "))
        ));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;

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
    .execute(&mut *tx)
    .await?;

    // Audit
    let admin_tenant_id = claims.tenant_uuid().unwrap_or(Uuid::nil());
    let admin_user_id = claims.user_id().unwrap_or(Uuid::nil());
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(admin_tenant_id)
    .bind(admin_user_id)
    .bind("create_tenant")
    .bind("tenant")
    .bind(id)
    .bind(serde_json::json!({"name": req.name, "plan": plan}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    // Note: RLS policies are created via migration, not dynamically.
    // The dynamic policy creation was a security risk and has been removed.

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
    _claims: axum::Extension<Claims>,
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
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTenantRequest>,
) -> Result<Json<TenantResponse>, AppError> {
    // Validate plan if provided
    if let Some(ref plan) = req.plan {
        if !VALID_PLANS.contains(&plan.as_str()) {
            return Err(AppError::BadRequest(
                format!("Invalid plan '{}'. Valid plans: {}", plan, VALID_PLANS.join(", "))
            ));
        }
    }

    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;

    // Verify tenant exists
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM tenants WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    if exists == 0 {
        return Err(AppError::NotFound);
    }

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
    .execute(&mut *tx)
    .await?;

    // Audit
    let admin_tenant_id = claims.tenant_uuid().unwrap_or(Uuid::nil());
    let admin_user_id = claims.user_id().unwrap_or(Uuid::nil());
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(admin_tenant_id)
    .bind(admin_user_id)
    .bind("update_tenant")
    .bind("tenant")
    .bind(id)
    .bind(serde_json::json!({"updated_fields": "multiple"}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

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
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = chrono::Utc::now();

    // Prevent admin from deactivating their own tenant
    if claims.tenant_id == id.to_string() {
        return Err(AppError::BadRequest("Cannot deactivate your own organization".into()));
    }

    let mut tx = pool.begin().await?;

    // Verify tenant exists
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM tenants WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    if exists == 0 {
        return Err(AppError::NotFound);
    }

    sqlx::query("UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Also deactivate all users in this tenant
    sqlx::query("UPDATE users SET is_active = false, updated_at = NOW() WHERE tenant_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Audit
    let admin_tenant_id = claims.tenant_uuid().unwrap_or(Uuid::nil());
    let admin_user_id = claims.user_id().unwrap_or(Uuid::nil());
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(admin_tenant_id)
    .bind(admin_user_id)
    .bind("deactivate_tenant")
    .bind("tenant")
    .bind(id)
    .bind("{\"action\": \"soft_delete\"}")
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "message": "Tenant and its users deactivated" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/tenants", get(list_tenants).post(create_tenant))
        .route("/api/tenants/{id}", get(get_tenant).put(update_tenant).delete(delete_tenant))
}
