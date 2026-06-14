use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateCustomerRequest {
    #[validate(length(min = 2))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListCustomersQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CustomerResponse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct CustomerListResponse {
    pub customers: Vec<CustomerResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_customers(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Query(params): Query<ListCustomersQuery>,
) -> Result<Json<CustomerListResponse>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let (customers, total): (Vec<CustomerResponse>, i64) = if let Some(ref search) = params.search {
        let pattern = format!("%{search}%");
        let customers = sqlx::query_as::<_, CustomerResponse>(
            "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
             FROM customers WHERE is_active = true AND (name ILIKE $1 OR email ILIKE $1 OR tax_id ILIKE $1) \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(&pattern)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM customers WHERE is_active = true AND (name ILIKE $1 OR email ILIKE $1 OR tax_id ILIKE $1)"
        )
        .bind(&pattern)
        .fetch_one(&pool)
        .await?;

        (customers, total)
    } else {
        let customers = sqlx::query_as::<_, CustomerResponse>(
            "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
             FROM customers WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM customers WHERE is_active = true"
        )
        .fetch_one(&pool)
        .await?;

        (customers, total)
    };

    Ok(Json(CustomerListResponse {
        customers,
        total,
        page,
        per_page,
    }))
}

async fn create_customer(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Json(req): Json<CreateCustomerRequest>,
) -> Result<Json<CustomerResponse>, AppError> {
    let tenant_id: Uuid = claims.tenant_id.parse().map_err(|_| AppError::BadRequest("Invalid tenant".into()))?;
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO customers (id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.address)
    .bind(&req.city)
    .bind(&req.country)
    .bind(&req.tax_id)
    .bind(&req.notes)
    .bind(true)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await?;

    // Audit log
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(claims.sub.parse::<Uuid>().map_err(|_| AppError::BadRequest("Invalid user".into()))?)
    .bind("create_customer")
    .bind("customer")
    .bind(id)
    .bind(serde_json::json!({"name": req.name, "email": req.email}).to_string())
    .bind(now)
    .execute(&pool)
    .await?;

    let customer = sqlx::query_as::<_, CustomerResponse>(
        "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
         FROM customers WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(customer))
}

async fn get_customer(
    State(pool): State<PgPool>,
    _claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<CustomerResponse>, AppError> {
    let customer = sqlx::query_as::<_, CustomerResponse>(
        "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
         FROM customers WHERE id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(customer))
}

async fn update_customer(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCustomerRequest>,
) -> Result<Json<CustomerResponse>, AppError> {
    let now = chrono::Utc::now();

    // Simplified: update all fields at once using COALESCE for partial updates
    sqlx::query(
        "UPDATE customers SET name = COALESCE($2, name), email = COALESCE($3, email), \
         phone = COALESCE($4, phone), address = COALESCE($5, address), city = COALESCE($6, city), \
         country = COALESCE($7, country), tax_id = COALESCE($8, tax_id), notes = COALESCE($9, notes), \
         updated_at = $10 WHERE id = $1"
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.address)
    .bind(&req.city)
    .bind(&req.country)
    .bind(&req.tax_id)
    .bind(&req.notes)
    .bind(now)
    .execute(&pool)
    .await?;

    // Audit
    let tenant_id: Uuid = claims.tenant_id.parse().unwrap_or_else(|_| Uuid::nil());
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind("update_customer")
    .bind("customer")
    .bind(id)
    .bind(serde_json::json!({"updated_fields": "multiple"}).to_string())
    .bind(now)
    .execute(&pool)
    .await?;

    let customer = sqlx::query_as::<_, CustomerResponse>(
        "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
         FROM customers WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(customer))
}

async fn delete_customer(
    State(pool): State<PgPool>,
    claims: axum::Extension<crate::middleware::Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Soft delete
    sqlx::query("UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    // Audit
    let tenant_id: Uuid = claims.tenant_id.parse().unwrap_or_else(|_| Uuid::nil());
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind("delete_customer")
    .bind("customer")
    .bind(id)
    .bind("{\"action\": \"soft_delete\"}")
    .bind(chrono::Utc::now())
    .execute(&pool)
    .await?;

    Ok(Json(serde_json::json!({ "message": "Customer deleted" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/customers", get(list_customers).post(create_customer))
        .route("/api/customers/{id}", get(get_customer).put(update_customer).delete(delete_customer))
}
