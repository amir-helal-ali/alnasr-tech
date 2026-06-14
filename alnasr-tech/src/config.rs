use secrecy::{ExposeSecret, SecretString};
use std::env;

/// Application configuration loaded from environment variables.
/// Sensitive values are wrapped in `SecretString` to prevent accidental leakage.
#[derive(Debug, Clone)]
pub struct AppConfig {
    // ── Database ──────────────────────────────────────────────────────
    pub database_url: SecretString,

    // ── JWT authentication ────────────────────────────────────────────
    pub jwt_secret: SecretString,
    pub jwt_expiration_secs: u64,

    // ── Server ────────────────────────────────────────────────────────
    pub server_host: String,
    pub server_port: u16,

    // ── Egyptian Tax Authority (ETA) E-Invoicing ─────────────────────
    pub eta_client_id: String,
    pub eta_client_secret: SecretString,
    pub eta_token_url: String,
    pub eta_submission_url: String,

    // ── SMTP / Email ─────────────────────────────────────────────────
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_pass: SecretString,
    pub smtp_from: String,
}

impl AppConfig {
    /// Load configuration from environment variables.
    ///
    /// All required variables must be present; the function panics with a
    /// descriptive message if any are missing or cannot be parsed.
    pub fn load() -> Self {
        Self {
            database_url: SecretString::new(
                env_or_panic("DATABASE_URL").into_boxed_str().into(),
            ),

            jwt_secret: SecretString::new(
                env_or_panic("JWT_SECRET").into_boxed_str().into(),
            ),
            jwt_expiration_secs: env_or_parse("JWT_EXPIRATION_SECS", 3600),

            server_host: env_or_default("SERVER_HOST", "0.0.0.0".to_string()),
            server_port: env_or_parse("SERVER_PORT", 3000),

            eta_client_id: env_or_panic("ETA_CLIENT_ID"),
            eta_client_secret: SecretString::new(
                env_or_panic("ETA_CLIENT_SECRET").into_boxed_str().into(),
            ),
            eta_token_url: env_or_panic("ETA_TOKEN_URL"),
            eta_submission_url: env_or_panic("ETA_SUBMISSION_URL"),

            smtp_host: env_or_panic("SMTP_HOST"),
            smtp_port: env_or_parse("SMTP_PORT", 587),
            smtp_user: env_or_panic("SMTP_USER"),
            smtp_pass: SecretString::new(
                env_or_panic("SMTP_PASS").into_boxed_str().into(),
            ),
            smtp_from: env_or_panic("SMTP_FROM"),
        }
    }

    /// Expose the database URL as a plain &str for SQLx connection setup.
    pub fn database_url(&self) -> &str {
        self.database_url.expose_secret()
    }

    /// Expose the JWT secret as plain bytes for token encoding/decoding.
    pub fn jwt_secret_bytes(&self) -> &[u8] {
        self.jwt_secret.expose_secret().as_bytes()
    }

    /// Build the full bind address string (host:port).
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.server_host, self.server_port)
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

/// Read an env var or panic with a helpful message.
fn env_or_panic(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| {
        panic!("Required environment variable `{key}` is not set")
    })
}

/// Read an env var or fall back to a default value.
fn env_or_default(key: &str, default: String) -> String {
    env::var(key).unwrap_or(default)
}

/// Parse an env var into a type that implements `FromStr`, or fall back to
/// the provided default.
fn env_or_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}
