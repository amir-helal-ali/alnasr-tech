//! Email event handler – processes email-related background jobs.

use crate::config::AppConfig;
use crate::email;
use crate::error::AppError;

/// Send a welcome email to a newly registered user.
pub async fn send_welcome_email(cfg: &AppConfig, to: &str, name: &str) -> Result<(), AppError> {
    let subject = "Welcome to Al-Nasr Tech ERP";
    let body = format!(
        "Dear {name},\n\n\
         Welcome to Al-Nasr Tech ERP + E-Invoicing System!\n\n\
         Your account has been successfully created.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );
    email::send_text_email(cfg, to, subject, &body).await
}

/// Send an invoice PDF email to a customer.
pub async fn send_invoice_email(
    cfg: &AppConfig,
    to: &str,
    customer_name: &str,
    invoice_number: &str,
) -> Result<(), AppError> {
    let subject = format!("Invoice #{invoice_number} from Al-Nasr Tech");
    let body = format!(
        "Dear {customer_name},\n\n\
         Please find attached your invoice #{invoice_number}.\n\n\
         Thank you for your business.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );
    email::send_text_email(cfg, to, &subject, &body).await
}

/// Send a password reset email.
pub async fn send_password_reset_email(
    cfg: &AppConfig,
    to: &str,
    reset_token: &str,
) -> Result<(), AppError> {
    let subject = "Password Reset Request – Al-Nasr Tech ERP";
    let body = format!(
        "Hello,\n\n\
         You requested a password reset. Use the following token to reset your password:\n\n\
         {reset_token}\n\n\
         If you did not request this, please ignore this email.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );
    email::send_text_email(cfg, to, subject, &body).await
}
