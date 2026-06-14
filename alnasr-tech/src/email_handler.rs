//! Email event handler – processes email-related background jobs.

use crate::config::AppConfig;
use crate::email;
use crate::error::AppError;

/// Send a welcome email to a newly registered user.
pub async fn send_welcome_email(cfg: &AppConfig, to: &str, name: &str) -> Result<(), AppError> {
    let subject = "مرحباً بك في نظام النصر تك | Welcome to Al-Nasr Tech ERP";
    let body = format!(
        "Dear {name},\n\n\
         Welcome to Al-Nasr Tech ERP + E-Invoicing System!\n\n\
         Your account has been successfully created. You can now:\n\
         - Create and manage customers\n\
         - Issue invoices with automatic VAT calculation\n\
         - Submit invoices to the Egyptian Tax Authority (ETA)\n\
         - Track payments and generate reports\n\n\
         If you have any questions, please contact our support team.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );
    email::send_text_email(cfg, to, subject, &body).await
}

/// Send an invoice PDF email to a customer with the invoice attached.
pub async fn send_invoice_email(
    cfg: &AppConfig,
    to: &str,
    customer_name: &str,
    invoice_number: &str,
    pdf_bytes: &[u8],
) -> Result<(), AppError> {
    let subject = format!("Invoice #{invoice_number} from Al-Nasr Tech | فاتورة رقم {invoice_number}");
    let body = format!(
        "Dear {customer_name},\n\n\
         Please find attached your invoice #{invoice_number}.\n\n\
         This is an ETA-compliant electronic invoice issued through Al-Nasr Tech ERP.\n\n\
         Payment Terms: Please remit payment by the due date shown on the invoice.\n\n\
         Thank you for your business.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );

    email::send_email_with_attachment(
        cfg,
        to,
        &subject,
        &body,
        &format!("invoice-{invoice_number}.pdf"),
        pdf_bytes,
        "application/pdf",
    )
    .await
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
         You requested a password reset for your Al-Nasr Tech ERP account.\n\n\
         Your reset token: {reset_token}\n\n\
         This token expires in 30 minutes. If you did not request this reset, \
         please ignore this email and your password will remain unchanged.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );
    email::send_text_email(cfg, to, subject, &body).await
}

/// Send a payment confirmation email.
pub async fn send_payment_confirmation_email(
    cfg: &AppConfig,
    to: &str,
    customer_name: &str,
    invoice_number: &str,
    amount: &str,
) -> Result<(), AppError> {
    let subject = format!("Payment Confirmed – Invoice #{invoice_number}");
    let body = format!(
        "Dear {customer_name},\n\n\
         We have received your payment of EGP {amount} for Invoice #{invoice_number}.\n\n\
         Thank you for your prompt payment.\n\n\
         Best regards,\n\
         Al-Nasr Tech Team"
    );
    email::send_text_email(cfg, to, &subject, &body).await
}
