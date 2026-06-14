//! Email sending utilities built on top of `lettre 0.11`.
//!
//! Uses `tokio1-rustls-tls` for async TLS and the `MultiPart` API
//! for attachments (replacing the removed `Message::attach()`).

use lettre::message::header::ContentType;
use lettre::message::{MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use secrecy::ExposeSecret;

use crate::config::AppConfig;
use crate::error::AppError;

/// Build an async SMTP transport from the application configuration.
pub fn build_transport(cfg: &AppConfig) -> Result<AsyncSmtpTransport<Tokio1Executor>, AppError> {
    let creds = Credentials::new(
        cfg.smtp_user.clone(),
        cfg.smtp_pass.expose_secret().to_string(),
    );

    let transport = AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.smtp_host)?
        .port(cfg.smtp_port)
        .credentials(creds)
        .timeout(Some(std::time::Duration::from_secs(30)))
        .build();

    Ok(transport)
}

/// Send a plain-text email asynchronously.
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

    transport.send(email).await.map_err(|e| {
        tracing::error!(error = %e, "Email send failed");
        AppError::from(e)
    })?;

    tracing::info!(to = to, subject = subject, "Email sent successfully");
    Ok(())
}

/// Send an HTML email asynchronously.
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

    transport.send(email).await.map_err(|e| {
        tracing::error!(error = %e, "HTML email send failed");
        AppError::from(e)
    })?;

    tracing::info!(to = to, subject = subject, "HTML email sent successfully");
    Ok(())
}

/// Send an email with a PDF attachment using `MultiPart` API (lettre 0.11).
pub async fn send_email_with_attachment(
    cfg: &AppConfig,
    to: &str,
    subject: &str,
    body: &str,
    attachment_name: &str,
    attachment_data: &[u8],
    attachment_content_type: &str,
) -> Result<(), AppError> {
    let transport = build_transport(cfg)?;

    let email = Message::builder()
        .from(cfg.smtp_from.parse().map_err(|e| AppError::BadRequest(format!("Invalid from address: {e}")))?)
        .to(to.parse().map_err(|e| AppError::BadRequest(format!("Invalid to address: {e}")))?)
        .subject(subject)
        .multipart(
            MultiPart::mixed()
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(body.to_string())
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::parse(attachment_content_type).unwrap_or_else(|_| ContentType::parse("application/pdf").unwrap()))
                        .header(lettre::message::header::ContentDisposition::attachment(&attachment_name))
                        .body(attachment_data.to_vec())
                )
        )
        .map_err(|e| AppError::Internal(format!("Failed to build multipart email: {e}")))?;

    transport.send(email).await.map_err(|e| {
        tracing::error!(error = %e, "Attachment email send failed");
        AppError::from(e)
    })?;

    tracing::info!(to = to, subject = subject, attachment = attachment_name, "Email with attachment sent");
    Ok(())
}
