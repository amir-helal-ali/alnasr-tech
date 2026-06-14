//! Email sending utilities built on top of `lettre`.

use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use secrecy::ExposeSecret;

use crate::config::AppConfig;
use crate::error::AppError;

/// Build an SMTP transport from the application configuration.
pub fn build_transport(cfg: &AppConfig) -> Result<SmtpTransport, AppError> {
    let creds = Credentials::new(
        cfg.smtp_user.clone(),
        cfg.smtp_pass.expose_secret().to_string(),
    );

    let transport = SmtpTransport::relay(&cfg.smtp_host)?
        .port(cfg.smtp_port)
        .credentials(creds)
        .build();

    Ok(transport)
}

/// Send a plain-text email.
pub async fn send_text_email(
    cfg: &AppConfig,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), AppError> {
    let transport = build_transport(cfg)?;

    let email = Message::builder()
        .from(cfg.smtp_from.parse().map_err(|e| AppError::BadRequest(format!("Invalid from address: {e}")))?)
        .to(to.parse().map_err(|e| AppError::BadRequest(format!("Invalid to address: {e}")))?)
        .subject(subject)
        .header(ContentType::TEXT_PLAIN)
        .body(body.to_string())
        .map_err(|e| AppError::Internal(format!("Failed to build email: {e}")))?;

    transport.send(&email).map_err(|e| AppError::from(e))?;
    Ok(())
}

/// Send an HTML email.
pub async fn send_html_email(
    cfg: &AppConfig,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<(), AppError> {
    let transport = build_transport(cfg)?;

    let email = Message::builder()
        .from(cfg.smtp_from.parse().map_err(|e| AppError::BadRequest(format!("Invalid from address: {e}")))?)
        .to(to.parse().map_err(|e| AppError::BadRequest(format!("Invalid to address: {e}")))?)
        .subject(subject)
        .header(ContentType::TEXT_HTML)
        .body(html_body.to_string())
        .map_err(|e| AppError::Internal(format!("Failed to build email: {e}")))?;

    transport.send(&email).map_err(|e| AppError::from(e))?;
    Ok(())
}
