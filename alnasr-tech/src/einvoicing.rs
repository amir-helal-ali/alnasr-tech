use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use rsa::{pkcs8::DecodePrivateKey, RsaPrivateKey};
use rsa::signature::{Signer, SignatureEncoding};
use rsa::pkcs1v15::SigningKey;
use sha2::Sha256;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EtaDocument {
    pub uuid: String,
    pub internal_id: String,
    pub invoice_number: String,
    pub invoice_type: String,
    pub issuer: EtaIssuer,
    pub receiver: EtaReceiver,
    pub document_type: String,
    pub total_amount: String,
    pub total_tax: String,
    pub line_items: Vec<EtaLineItem>,
    pub issue_date: String,
    pub issue_time: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EtaIssuer {
    pub name: String,
    pub tax_id: String,
    pub address: EtaAddress,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EtaReceiver {
    pub name: String,
    pub tax_id: String,
    pub address: EtaAddress,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EtaAddress {
    pub country: String,
    pub city: String,
    pub street: String,
    pub building: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EtaLineItem {
    pub description: String,
    pub quantity: String,
    pub unit_price: String,
    pub tax_rate: String,
    pub tax_amount: String,
    pub total: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EtaSubmissionRequest {
    pub documents: Vec<EtaDocument>,
    pub signature: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EtaTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EtaSubmissionResponse {
    pub submission_id: String,
    pub status: String,
    pub accepted_documents: u32,
    pub rejected_documents: u32,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EtaSubmissionRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub invoice_id: Uuid,
    pub submission_id: Option<String>,
    pub status: String,
    pub eta_uuid: Option<String>,
    pub response_data: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub submitted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitInvoiceRequest {
    pub invoice_id: Uuid,
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn get_eta_token(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
) -> Result<Json<EtaTokenResponse>, AppError> {
    let client_id = std::env::var("ETA_CLIENT_ID").map_err(|_| AppError::Internal("ETA_CLIENT_ID not set".into()))?;
    let client_secret = std::env::var("ETA_CLIENT_SECRET").map_err(|_| AppError::Internal("ETA_CLIENT_SECRET not set".into()))?;
    let token_url = std::env::var("ETA_TOKEN_URL").map_err(|_| AppError::Internal("ETA_TOKEN_URL not set".into()))?;

    // In production, make HTTP request to ETA token endpoint
    // For now, return a placeholder
    let client = reqwest_client();
    let response = client
        .post(&token_url)
        .form(&[
            ("grant_type", "client_credentials"),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
        ])
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("ETA token request failed: {e}")))?;

    let token_response: EtaTokenResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse ETA token response: {e}")))?;

    // Cache the token
    sqlx::query(
        "INSERT INTO eta_tokens (id, tenant_id, access_token, expires_at, created_at) \
         VALUES ($1, $2, $3, NOW() + INTERVAL '3600 seconds', NOW()) \
         ON CONFLICT (tenant_id) DO UPDATE SET access_token = $3, expires_at = NOW() + INTERVAL '3600 seconds'"
    )
    .bind(Uuid::new_v4())
    .bind(Uuid::nil()) // placeholder tenant_id
    .bind(&token_response.access_token)
    .execute(&pool)
    .await
    .ok(); // Best-effort caching

    Ok(Json(token_response))
}

async fn submit_invoice(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<SubmitInvoiceRequest>,
) -> Result<Json<EtaSubmissionRecord>, AppError> {
    let tenant_id: Uuid = claims.tenant_id.parse().map_err(|_| AppError::BadRequest("Invalid tenant".into()))?;
    let now = chrono::Utc::now();

    // Fetch invoice data
    let invoice = sqlx::query_as::<_, (Uuid, String, Uuid, String, rust_decimal::Decimal, rust_decimal::Decimal, rust_decimal::Decimal)>(
        "SELECT id, invoice_number, customer_id, status, subtotal, tax_total, total FROM invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(req.invoice_id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let (_, _invoice_number, _customer_id, status, _subtotal, _tax_total, _total) = &invoice;

    if status != "issued" && status != "draft" {
        return Err(AppError::BadRequest("Invoice must be in issued status to submit to ETA".into()));
    }

    // Update invoice status to 'submitted'
    sqlx::query("UPDATE invoices SET status = 'submitted', updated_at = $1 WHERE id = $2")
        .bind(now)
        .bind(req.invoice_id)
        .execute(&pool)
        .await?;

    // Create submission record
    let record_id = Uuid::new_v4();
    let submission_id = format!("SUB-{}", Uuid::new_v4());

    sqlx::query(
        "INSERT INTO eta_submissions (id, tenant_id, invoice_id, submission_id, status, submitted_at, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(record_id)
    .bind(tenant_id)
    .bind(req.invoice_id)
    .bind(&submission_id)
    .bind("pending")
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await?;

    // In production: build EtaDocument, sign with RSA-SHA256, submit to ETA API
    // For now, simulate a successful submission
    let eta_uuid = format!("{}", Uuid::new_v4());

    sqlx::query(
        "UPDATE eta_submissions SET status = 'accepted', eta_uuid = $1, response_data = $2 WHERE id = $3"
    )
    .bind(&eta_uuid)
    .bind(serde_json::json!({"submission_id": submission_id, "eta_uuid": eta_uuid}))
    .bind(record_id)
    .execute(&pool)
    .await?;

    // Update invoice status
    sqlx::query("UPDATE invoices SET status = 'accepted', updated_at = NOW() WHERE id = $1")
        .bind(req.invoice_id)
        .execute(&pool)
        .await?;

    let record = sqlx::query_as::<_, EtaSubmissionRecord>(
        "SELECT id, tenant_id, invoice_id, submission_id, status, eta_uuid, response_data, error_message, submitted_at, created_at \
         FROM eta_submissions WHERE id = $1"
    )
    .bind(record_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(record))
}

async fn submission_status(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<EtaSubmissionRecord>, AppError> {
    let record = sqlx::query_as::<_, EtaSubmissionRecord>(
        "SELECT id, tenant_id, invoice_id, submission_id, status, eta_uuid, response_data, error_message, submitted_at, created_at \
         FROM eta_submissions WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(record))
}

// ── Helper: sign document with RSA-SHA256 ───────────────────────────────

/// Sign a canonical JSON document with RSA-SHA256 using the private key.
/// Uses `SigningKey::<Sha256>::new_unprefixed()` per rsa 0.9 API.
pub fn sign_document(document_json: &str, private_key_pem: &str) -> Result<String, AppError> {
    let private_key = RsaPrivateKey::from_pkcs8_pem(private_key_pem)
        .map_err(|e| AppError::Internal(format!("Invalid RSA private key: {e}")))?;

    let signing_key = SigningKey::<Sha256>::new_unprefixed(private_key);
    let signature = signing_key.sign(document_json.as_bytes());

    Ok(base64_encode(&signature.to_bytes()))
}

fn base64_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(data)
}

/// Lazy reqwest client for ETA API calls.
fn reqwest_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to build reqwest client")
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/einvoicing/submit", post(submit_invoice))
        .route("/api/einvoicing/status/{id}", get(submission_status))
        .route("/api/einvoicing/token", get(get_eta_token))
}
