use axum::{
    extract::State,
    http::StatusCode,
    middleware::Next,
    body::Body,
    response::Response,
    Extension,
};
use http::request::Request;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;

use crate::error::AppError;
use sqlx::PgPool;

// ── JWT Claims ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub tenant_id: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

// ── Auth middleware ────────────────────────────────────────────────────

/// Extract and validate JWT from the Authorization header.
/// On success, claims are inserted into request extensions so handlers
/// can access them via `Extension<Claims>`.
pub async fn auth_middleware(
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let jwt_secret =
        std::env::var("JWT_SECRET").map_err(|_| AppError::Internal("JWT_SECRET not set".into()))?;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| AppError::Unauthorized)?;

    req.extensions_mut().insert(token_data.claims);

    Ok(next.run(req).await)
}

/// Middleware that requires the authenticated user to have the "admin" role.
pub async fn admin_only_middleware(req: Request<Body>, next: Next) -> Result<Response, AppError> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .ok_or(AppError::Unauthorized)?;

    if claims.role != "admin" {
        return Err(AppError::Forbidden);
    }

    Ok(next.run(req).await)
}

// ── Rate limiter ───────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct RateLimiter {
    entries: Arc<Mutex<HashMap<String, (u64, Instant)>>>,
    max_requests: u64,
    window_secs: u64,
}

impl RateLimiter {
    pub fn new(max_requests: u64, window_secs: u64) -> Self {
        Self {
            entries: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window_secs,
        }
    }

    pub async fn is_allowed(&self, key: &str) -> bool {
        let mut entries = self.entries.lock().await;
        let now = Instant::now();
        let window_duration = std::time::Duration::from_secs(self.window_secs);

        let entry = entries.entry(key.to_string()).or_insert((0, now));

        if now.duration_since(entry.1) > window_duration {
            *entry = (1, now);
            return true;
        }

        entry.0 += 1;
        entry.0 <= self.max_requests
    }

    /// Evict expired entries to prevent memory leaks.
    pub async fn evict_expired(&self) {
        let mut entries = self.entries.lock().await;
        let now = Instant::now();
        let window_duration = std::time::Duration::from_secs(self.window_secs);
        entries.retain(|_, (_, created)| now.duration_since(*created) < window_duration);
    }
}

/// Rate-limiting middleware.
pub async fn rate_limit_middleware(
    State(limiter): State<Arc<RateLimiter>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    if !limiter.is_allowed(&ip).await {
        return Err(AppError::RateLimited);
    }

    Ok(next.run(req).await)
}

// ── RLS (Row Level Security) helpers ──────────────────────────────────

/// Set PostgreSQL session variables for Row Level Security.
/// Must be called within a transaction before executing queries.
pub async fn set_rls_context(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: uuid::Uuid,
    user_id: uuid::Uuid,
) -> Result<(), AppError> {
    sqlx::query("SET LOCAL app.current_tenant_id = $1")
        .bind(tenant_id.to_string())
        .execute(&mut **tx)
        .await?;

    sqlx::query("SET LOCAL app.current_user_id = $1")
        .bind(user_id.to_string())
        .execute(&mut **tx)
        .await?;

    Ok(())
}

/// Set RLS context using a plain connection (not transaction).
pub async fn set_rls_context_conn(
    conn: &mut sqlx::PgConnection,
    tenant_id: uuid::Uuid,
    user_id: uuid::Uuid,
) -> Result<(), AppError> {
    sqlx::query("SET app.current_tenant_id = $1")
        .bind(tenant_id.to_string())
        .execute(&mut *conn)
        .await?;

    sqlx::query("SET app.current_user_id = $1")
        .bind(user_id.to_string())
        .execute(&mut *conn)
        .await?;

    Ok(())
}
