use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use argon2::{Argon2, PasswordHasher};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;

// ── Types ───────────────────────────────────────────────────────────────

const VALID_ROLES: &[&str] = &["admin", "accountant", "user", "viewer"];

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    #[validate(length(min = 2, message = "Name must be at least 2 characters"))]
    pub name: String,
    pub tenant_id: Uuid,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListUsersQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub role: Option<String>,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub tenant_id: Option<Uuid>,
    pub role: String,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub users: Vec<UserResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

/// Validate request and return early if validation fails.
fn validate_request<T: validator::Validate>(req: &T) -> Result<(), AppError> {
    req.validate().map_err(AppError::from)
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_users(
    State(pool): State<PgPool>,
    _claims: axum::Extension<Claims>,
    Query(params): Query<ListUsersQuery>,
) -> Result<Json<UserListResponse>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let users = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, tenant_id, role, is_active, created_at, updated_at \
         FROM users WHERE ($1::text IS NULL OR role = $1) AND ($2::uuid IS NULL OR tenant_id = $2) \
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    )
    .bind(&params.role)
    .bind(params.tenant_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE ($1::text IS NULL OR role = $1) AND ($2::uuid IS NULL OR tenant_id = $2)"
    )
    .bind(&params.role)
    .bind(params.tenant_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(UserListResponse { users, total, page, per_page }))
}

async fn create_user(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    validate_request(&req)?;

    // Validate role
    let role = req.role.unwrap_or_else(|| "user".to_string());
    if !VALID_ROLES.contains(&role.as_str()) {
        return Err(AppError::BadRequest(
            format!("Invalid role '{}'. Valid roles: {}", role, VALID_ROLES.join(", "))
        ));
    }

    let mut tx = pool.begin().await?;

    // Check if email already exists
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_one(&mut *tx)
    .await?;

    if existing > 0 {
        return Err(AppError::BadRequest("Email already registered".into()));
    }

    // Verify tenant exists
    let tenant_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM tenants WHERE id = $1 AND is_active = true"
    )
    .bind(req.tenant_id)
    .fetch_one(&mut *tx)
    .await?;

    if tenant_exists == 0 {
        return Err(AppError::BadRequest("Tenant not found or inactive".into()));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(req.password.as_bytes(), &salt)?
        .to_string();

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(id)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.name)
    .bind(req.tenant_id)
    .bind(&role)
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
    .bind("create_user")
    .bind("user")
    .bind(id)
    .bind(serde_json::json!({"email": req.email, "role": role}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(UserResponse {
        id,
        email: req.email,
        name: req.name,
        tenant_id: Some(req.tenant_id),
        role,
        is_active: true,
        created_at: now,
        updated_at: now,
    }))
}

async fn get_user(
    State(pool): State<PgPool>,
    _claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<UserResponse>, AppError> {
    let user = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, tenant_id, role, is_active, created_at, updated_at FROM users WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(user))
}

async fn update_user(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    // Validate role if provided
    if let Some(ref role) = req.role {
        if !VALID_ROLES.contains(&role.as_str()) {
            return Err(AppError::BadRequest(
                format!("Invalid role '{}'. Valid roles: {}", role, VALID_ROLES.join(", "))
            ));
        }
    }

    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;

    // Verify user exists
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    if exists == 0 {
        return Err(AppError::NotFound);
    }

    // If email is being changed, check for duplicates
    if let Some(ref email) = req.email {
        let duplicate = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM users WHERE email = $1 AND id != $2"
        )
        .bind(email)
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;

        if duplicate > 0 {
            return Err(AppError::BadRequest("Email already in use by another user".into()));
        }
    }

    sqlx::query(
        "UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), \
         role = COALESCE($3, role), is_active = COALESCE($4, is_active), updated_at = $5 WHERE id = $6"
    )
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.role)
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
    .bind("update_user")
    .bind("user")
    .bind(id)
    .bind(serde_json::json!({"updated_fields": "multiple"}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let user = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, tenant_id, role, is_active, created_at, updated_at FROM users WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(user))
}

async fn delete_user(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = chrono::Utc::now();

    // Prevent admin from deactivating themselves
    if claims.sub == id.to_string() {
        return Err(AppError::BadRequest("Cannot deactivate your own account".into()));
    }

    let mut tx = pool.begin().await?;

    // Verify user exists
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    if exists == 0 {
        return Err(AppError::NotFound);
    }

    sqlx::query("UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Invalidate refresh tokens
    sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
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
    .bind("deactivate_user")
    .bind("user")
    .bind(id)
    .bind("{\"action\": \"soft_delete\"}")
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "message": "User deactivated" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/users", get(list_users).post(create_user))
        .route("/api/users/{id}", get(get_user).put(update_user).delete(delete_user))
}
