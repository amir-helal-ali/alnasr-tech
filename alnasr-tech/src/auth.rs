use axum::{
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;

// ── Request / Response types ────────────────────────────────────────────

#[derive(Debug, Deserialize, validator::Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    #[validate(length(min = 2, message = "Name must be at least 2 characters"))]
    pub name: String,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct RefreshRequest {
    #[validate(length(min = 1, message = "Refresh token is required"))]
    pub refresh_token: String,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 8, message = "Current password must be at least 8 characters"))]
    pub old_password: String,
    #[validate(length(min = 8, message = "New password must be at least 8 characters"))]
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub tenant_id: Option<Uuid>,
    pub role: String,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    password_hash: String,
    name: String,
    tenant_id: Option<Uuid>,
    role: String,
    is_active: bool,
    created_at: chrono::DateTime<Utc>,
    updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[allow(dead_code)]
struct RefreshTokenRow {
    id: Uuid,
    user_id: Uuid,
    token_hash: String,
    expires_at: chrono::DateTime<Utc>,
    created_at: chrono::DateTime<Utc>,
}

// ── JWT helpers ─────────────────────────────────────────────────────────

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").expect("JWT_SECRET must be set")
}

fn jwt_expiration_secs() -> i64 {
    std::env::var("JWT_EXPIRATION_SECS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3600)
}

fn create_token(user: &UserRow) -> Result<(String, String), AppError> {
    let now = Utc::now();
    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        tenant_id: user.tenant_id.map(|t| t.to_string()).unwrap_or_default(),
        role: user.role.clone(),
        exp: (now + Duration::seconds(jwt_expiration_secs())).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret().as_bytes()),
    )?;

    // Refresh token: longer-lived (7 days)
    let refresh_claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        tenant_id: user.tenant_id.map(|t| t.to_string()).unwrap_or_default(),
        role: user.role.clone(),
        exp: (now + Duration::days(7)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(jwt_secret().as_bytes()),
    )?;

    Ok((token, refresh_token))
}

fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    Ok(argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string())
}

fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let parsed_hash = PasswordHash::new(hash)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// Validate request and return early if validation fails.
fn validate_request<T: validator::Validate>(req: &T) -> Result<(), AppError> {
    req.validate().map_err(AppError::from)
}

// ── Route handlers ──────────────────────────────────────────────────────

async fn login_handler(
    State(pool): State<PgPool>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    validate_request(&req)?;

    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at \
         FROM users WHERE email = $1 AND is_active = true"
    )
    .bind(&req.email)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| {
        // Deliberately vague error to prevent email enumeration
        AppError::Unauthorized
    })?;

    if !verify_password(&req.password, &user.password_hash)? {
        // Rate limiting should be applied at the middleware level
        // but we also log failed attempts here
        tracing::warn!(email = %req.email, "Failed login attempt");
        return Err(AppError::Unauthorized);
    }

    let (token, refresh_token) = create_token(&user)?;

    // Store refresh token hash in a transaction
    let mut tx = pool.begin().await?;

    let token_hash = sha2::Sha256::digest(refresh_token.as_bytes());
    let token_hash_hex = format!("{:x}", token_hash);
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)"
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&token_hash_hex)
    .bind(Utc::now() + Duration::days(7))
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    tracing::info!(user_id = %user.id, "User logged in successfully");

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            tenant_id: user.tenant_id,
            role: user.role,
            created_at: user.created_at,
        },
    }))
}

async fn register_handler(
    State(pool): State<PgPool>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    validate_request(&req)?;

    // Check if email already exists
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_one(&pool)
    .await?;

    if existing > 0 {
        return Err(AppError::BadRequest("Email already registered".into()));
    }

    let password_hash = hash_password(&req.password)?;
    let user_id = Uuid::new_v4();
    let tenant_id = req.tenant_id.unwrap_or_else(Uuid::new_v4);
    let now = Utc::now();

    // Use transaction for atomic tenant + user creation
    let mut tx = pool.begin().await?;

    // Create tenant if not provided
    if req.tenant_id.is_none() {
        sqlx::query(
            "INSERT INTO tenants (id, name, plan, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(tenant_id)
        .bind(format!("{}'s Organization", req.name))
        .bind("free")
        .bind(true)
        .bind(now)
        .bind(now)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(user_id)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.name)
    .bind(tenant_id)
    .bind("admin")
    .bind(true)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let user = UserRow {
        id: user_id,
        email: req.email,
        password_hash,
        name: req.name,
        tenant_id: Some(tenant_id),
        role: "admin".to_string(),
        is_active: true,
        created_at: now,
        updated_at: now,
    };

    let (token, refresh_token) = create_token(&user)?;

    // Store refresh token
    let token_hash = sha2::Sha256::digest(refresh_token.as_bytes());
    let token_hash_hex = format!("{:x}", token_hash);
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)"
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&token_hash_hex)
    .bind(Utc::now() + Duration::days(7))
    .execute(&pool)
    .await?;

    tracing::info!(user_id = %user_id, tenant_id = %tenant_id, "New user registered");

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            tenant_id: user.tenant_id,
            role: user.role,
            created_at: user.created_at,
        },
    }))
}

async fn refresh_handler(
    State(pool): State<PgPool>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    validate_request(&req)?;

    let token_data = decode::<Claims>(
        &req.refresh_token,
        &DecodingKey::from_secret(jwt_secret().as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    let user_id: Uuid = token_data.claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    // Verify refresh token is in DB (transaction for rotation atomicity)
    let mut tx = pool.begin().await?;

    let token_hash = sha2::Sha256::digest(req.refresh_token.as_bytes());
    let token_hash_hex = format!("{:x}", token_hash);
    let stored = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()"
    )
    .bind(user_id)
    .bind(&token_hash_hex)
    .fetch_one(&mut *tx)
    .await?;

    if stored == 0 {
        tx.commit().await?;
        return Err(AppError::Unauthorized);
    }

    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at \
         FROM users WHERE id = $1 AND is_active = true"
    )
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::Unauthorized)?;

    // Delete old refresh token (rotation)
    sqlx::query("DELETE FROM refresh_tokens WHERE token_hash = $1")
        .bind(&token_hash_hex)
        .execute(&mut *tx)
        .await?;

    let (token, new_refresh_token) = create_token(&user)?;

    // Store new refresh token
    let new_token_hash = sha2::Sha256::digest(new_refresh_token.as_bytes());
    let new_token_hash_hex = format!("{:x}", new_token_hash);
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)"
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&new_token_hash_hex)
    .bind(Utc::now() + Duration::days(7))
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(AuthResponse {
        token,
        refresh_token: new_refresh_token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            tenant_id: user.tenant_id,
            role: user.role,
            created_at: user.created_at,
        },
    }))
}

async fn me_handler(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
) -> Result<Json<UserResponse>, AppError> {
    let user_id: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at \
         FROM users WHERE id = $1 AND is_active = true"
    )
    .bind(user_id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(UserResponse {
        id: user.id,
        email: user.email,
        name: user.name,
        tenant_id: user.tenant_id,
        role: user.role,
        created_at: user.created_at,
    }))
}

async fn change_password_handler(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<ChangePasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    validate_request(&req)?;

    // Verify new password differs from old password
    if req.old_password == req.new_password {
        return Err(AppError::BadRequest("New password must differ from current password".into()));
    }

    let user_id: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    let mut tx = pool.begin().await?;

    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at \
         FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if !verify_password(&req.old_password, &user.password_hash)? {
        return Err(AppError::BadRequest("Current password is incorrect".into()));
    }

    let new_hash = hash_password(&req.new_password)?;

    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&new_hash)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Invalidate all refresh tokens (force re-login on other devices)
    sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    tracing::info!(user_id = %user_id, "Password changed successfully");

    Ok(Json(serde_json::json!({ "message": "Password changed successfully" })))
}

// ── Routers ─────────────────────────────────────────────────────────────

/// Public auth routes that do NOT require authentication.
/// These are merged directly into the public route group.
pub fn public_router() -> Router<PgPool> {
    Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/refresh", post(refresh_handler))
}

/// Protected auth routes that REQUIRE authentication.
/// These are merged into the protected route group (behind auth middleware).
pub fn protected_router() -> Router<PgPool> {
    Router::new()
        .route("/api/auth/me", get(me_handler))
        .route("/api/auth/change-password", put(change_password_handler))
}

use sha2::Digest;
