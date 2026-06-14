use axum::{
    middleware::Next,
    body::Body,
    response::Response,
};
use http::request::Request;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;

use crate::error::AppError;

// ═══════════════════════════════════════════════════════════════════════
// JWT Claims – Core authentication identity
// ═══════════════════════════════════════════════════════════════════════

/// JWT Claims embedded in every authenticated request.
///
/// Extracted from the `Authorization: Bearer <token>` header and
/// made available to handlers via `Extension<Claims>`.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject – User UUID
    pub sub: String,
    /// User email address
    pub email: String,
    /// Tenant UUID for multi-tenant isolation
    pub tenant_id: String,
    /// User role: admin, accountant, user, etc.
    pub role: String,
    /// Expiration timestamp (Unix epoch)
    pub exp: usize,
    /// Issued-at timestamp (Unix epoch)
    pub iat: usize,
}

impl Claims {
    /// Parse the user ID as a UUID.
    pub fn user_id(&self) -> Result<uuid::Uuid, AppError> {
        uuid::Uuid::parse_str(&self.sub)
            .map_err(|_| AppError::Internal("Invalid user ID in token".into()))
    }

    /// Parse the tenant ID as a UUID.
    pub fn tenant_uuid(&self) -> Result<uuid::Uuid, AppError> {
        uuid::Uuid::parse_str(&self.tenant_id)
            .map_err(|_| AppError::Internal("Invalid tenant ID in token".into()))
    }

    /// Check if the user has admin privileges.
    pub fn is_admin(&self) -> bool {
        self.role == "admin"
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Auth middleware
// ═══════════════════════════════════════════════════════════════════════

/// Extract and validate JWT from the Authorization header.
///
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
        std::env::var("JWT_SECRET").map_err(|_| AppError::Internal("JWT_SECRET not configured".into()))?;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|e| {
        tracing::warn!(error = %e, "JWT validation failed");
        AppError::Unauthorized
    })?;

    req.extensions_mut().insert(token_data.claims);

    Ok(next.run(req).await)
}

/// Middleware that requires the authenticated user to have the "admin" role.
///
/// Must be layered AFTER `auth_middleware` so that `Claims` are already
/// present in the request extensions.
pub async fn admin_only_middleware(req: Request<Body>, next: Next) -> Result<Response, AppError> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .ok_or(AppError::Unauthorized)?;

    if !claims.is_admin() {
        tracing::warn!(
            user_id = %claims.sub,
            role = %claims.role,
            "Non-admin attempted admin action"
        );
        return Err(AppError::Forbidden);
    }

    Ok(next.run(req).await)
}

// ═══════════════════════════════════════════════════════════════════════
// Rate limiter – Token bucket per IP
// ═══════════════════════════════════════════════════════════════════════

/// Per-IP rate limiting using a token bucket algorithm.
///
/// Default: 100 requests per 60-second window per IP.
/// Configured for 5,000–10,000 concurrent users on 2-4 vCPU VPS.
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

    /// Production default: 100 req/min per IP.
    pub fn production() -> Self {
        Self::new(100, 60)
    }

    /// Check if a request from the given key is allowed.
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
    /// Should be called periodically (e.g., every 5 minutes).
    pub async fn evict_expired(&self) {
        let mut entries = self.entries.lock().await;
        let now = Instant::now();
        let window_duration = std::time::Duration::from_secs(self.window_secs);
        let before = entries.len();
        entries.retain(|_, (_, created)| now.duration_since(*created) < window_duration);
        let after = entries.len();
        if before != after {
            tracing::debug!(evicted = before - after, remaining = after, "Rate limiter eviction");
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Row Level Security helpers
// ═══════════════════════════════════════════════════════════════════════

/// Set PostgreSQL session variables for Row Level Security within a transaction.
///
/// Must be called within an active transaction before executing queries.
/// Uses `SET LOCAL` so variables are scoped to the transaction.
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

    tracing::debug!(tenant_id = %tenant_id, user_id = %user_id, "RLS context set");
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
