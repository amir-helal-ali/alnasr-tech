use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

/// Unified error type for the entire application.
///
/// Every handler returns `Result<T, AppError>`, and the `IntoResponse`
/// implementation maps each variant to the appropriate HTTP status code
/// with a JSON body.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Resource not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    Internal(String),

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error("Rate limited – too many requests")]
    RateLimited,
}

/// JSON body returned for every error response.
#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    status: u16,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Internal(msg) => {
                tracing::error!("Internal server error: {msg}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            AppError::Database(err) => {
                tracing::error!("Database error: {err}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            }
            AppError::RateLimited => (StatusCode::TOO_MANY_REQUESTS, self.to_string()),
        };

        let body = ErrorResponse {
            error: message,
            status: status.as_u16(),
        };

        (status, axum::Json(body)).into_response()
    }
}

// ── From impls for external error types ────────────────────────────────

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::BadRequest(format!("JSON error: {err}"))
    }
}

impl From<argon2::password_hash::Error> for AppError {
    fn from(err: argon2::password_hash::Error) -> Self {
        AppError::Internal(format!("Password hash error: {err}"))
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        match err.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::Unauthorized,
            jsonwebtoken::errors::ErrorKind::InvalidToken => AppError::Unauthorized,
            _ => AppError::Internal(format!("JWT error: {err}")),
        }
    }
}

impl From<lettre::transport::smtp::Error> for AppError {
    fn from(err: lettre::transport::smtp::Error) -> Self {
        AppError::Internal(format!("SMTP error: {err}"))
    }
}

impl From<printpdf::Error> for AppError {
    fn from(err: printpdf::Error) -> Self {
        AppError::Internal(format!("PDF generation error: {err}"))
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Internal(format!("I/O error: {err}"))
    }
}

impl From<csv::Error> for AppError {
    fn from(err: csv::Error) -> Self {
        AppError::Internal(format!("CSV error: {err}"))
    }
}

impl From<validator::ValidationErrors> for AppError {
    fn from(err: validator::ValidationErrors) -> Self {
        AppError::BadRequest(format!("Validation error: {err}"))
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::Internal(format!("HTTP client error: {err}"))
    }
}
