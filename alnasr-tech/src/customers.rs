use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;

// ── Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateCustomerRequest {
    #[validate(length(min = 2, message = "Name must be at least 2 characters"))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(max = 50, message = "Phone must be at most 50 characters"))]
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct UpdateCustomerRequest {
    #[validate(length(min = 2, message = "Name must be at least 2 characters"))]
    pub name: Option<String>,
    #[validate(email)]
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

/// Validate request and return early if validation fails.
fn validate_request<T: validator::Validate>(req: &T) -> Result<(), AppError> {
    req.validate().map_err(AppError::from)
}

// ── Handlers ────────────────────────────────────────────────────────────

async fn list_customers(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Query(params): Query<ListCustomersQuery>,
) -> Result<Json<CustomerListResponse>, AppError> {
    let tenant_id = claims.tenant_uuid()?;
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let (customers, total): (Vec<CustomerResponse>, i64) = if let Some(ref search) = params.search {
        let pattern = format!("%{search}%");
        let customers = sqlx::query_as::<_, CustomerResponse>(
            "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
             FROM customers WHERE is_active = true AND tenant_id = $1 AND (name ILIKE $2 OR email ILIKE $2 OR tax_id ILIKE $2) \
             ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        )
        .bind(tenant_id)
        .bind(&pattern)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM customers WHERE is_active = true AND tenant_id = $1 AND (name ILIKE $2 OR email ILIKE $2 OR tax_id ILIKE $2)"
        )
        .bind(tenant_id)
        .bind(&pattern)
        .fetch_one(&pool)
        .await?;

        (customers, total)
    } else {
        let customers = sqlx::query_as::<_, CustomerResponse>(
            "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
             FROM customers WHERE is_active = true AND tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(tenant_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM customers WHERE is_active = true AND tenant_id = $1"
        )
        .bind(tenant_id)
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
    claims: axum::Extension<Claims>,
    Json(req): Json<CreateCustomerRequest>,
) -> Result<Json<CustomerResponse>, AppError> {
    validate_request(&req)?;

    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;

    // Set RLS context
    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    // Check for duplicate email within tenant
    let duplicate = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND email = $2 AND is_active = true"
    )
    .bind(tenant_id)
    .bind(&req.email)
    .fetch_one(&mut *tx)
    .await?;

    if duplicate > 0 {
        return Err(AppError::BadRequest("A customer with this email already exists in your organization".into()));
    }

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
    .execute(&mut *tx)
    .await?;

    // Audit log
    sqlx::query(
        "INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind("create_customer")
    .bind("customer")
    .bind(id)
    .bind(serde_json::json!({"name": req.name, "email": req.email}).to_string())
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

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
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<CustomerResponse>, AppError> {
    let tenant_id = claims.tenant_uuid()?;

    let customer = sqlx::query_as::<_, CustomerResponse>(
        "SELECT id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at \
         FROM customers WHERE id = $1 AND tenant_id = $2 AND is_active = true"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(customer))
}

async fn update_customer(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCustomerRequest>,
) -> Result<Json<CustomerResponse>, AppError> {
    validate_request(&req)?;

    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;

    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    // Verify ownership
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM customers WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut *tx)
    .await?;

    if exists == 0 {
        return Err(AppError::NotFound);
    }

    // If email is being changed, check for duplicates
    if let Some(ref email) = req.email {
        let duplicate = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND email = $2 AND id != $3 AND is_active = true"
        )
        .bind(tenant_id)
        .bind(email)
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;

        if duplicate > 0 {
            return Err(AppError::BadRequest("A customer with this email already exists".into()));
        }
    }

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
    .execute(&mut *tx)
    .await?;

    // Audit
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
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

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
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tenant_id = claims.tenant_uuid()?;
    let user_id = claims.user_id()?;
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await?;

    crate::middleware::set_rls_context(&mut tx, tenant_id, user_id).await?;

    // Verify ownership before soft delete
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM customers WHERE id = $1 AND tenant_id = $2 AND is_active = true"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut *tx)
    .await?;

    if exists == 0 {
        return Err(AppError::NotFound);
    }

    // Check if customer has active invoices
    let invoice_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM invoices WHERE customer_id = $1 AND status NOT IN ('paid', 'cancelled')"
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    if invoice_count > 0 {
        return Err(AppError::BadRequest(
            "Cannot delete customer with active invoices. Please settle or cancel invoices first.".into()
        ));
    }

    // Soft delete
    sqlx::query("UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Audit
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
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "message": "Customer deleted" })))
}

// ── Router ──────────────────────────────────────────────────────────────

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/customers", get(list_customers).post(create_customer))
        .route("/api/customers/{id}", get(get_customer).put(update_customer).delete(delete_customer))
}
