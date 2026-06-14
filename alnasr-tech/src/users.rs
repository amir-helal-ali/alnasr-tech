use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
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

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
    #[validate(length(min = 2))]
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

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_users(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
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
    _claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_one(&pool)
    .await?;

    if existing > 0 {
        return Err(AppError::BadRequest("Email already registered".into()));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(req.password.as_bytes(), &salt)?
        .to_string();

    let role = req.role.unwrap_or_else(|| "user".to_string());

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
    .execute(&pool)
    .await?;

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
    _claims: axum::Extension<crate::middleware::Claims>,
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
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    let now = chrono::Utc::now();

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
    .execute(&pool)
    .await?;

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
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query("UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(Json(serde_json::json!({ "message": "User deactivated" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/users", get(list_users).post(create_user))
        .route("/api/users/{id}", get(get_user).put(update_user).delete(delete_user))
}
