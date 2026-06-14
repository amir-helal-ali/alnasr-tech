//! OpenAPI documentation and Swagger UI integration.
//!
//! Provides a complete API specification for the Al-Nasr Tech ERP system,
//! accessible at `/api/docs` (Swagger UI) and `/api/openapi.json` (raw spec).
//!
//! This module is only compiled when the `swagger` feature is enabled.

use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

/// Build the Swagger UI router mounted at `/api/docs`.
pub fn swagger_ui() -> SwaggerUi {
    SwaggerUi::new("/api/docs")
        .url("/api/openapi.json", ApiDoc::openapi())
}

/// Main OpenAPI specification for the Al-Nasr Tech ERP API.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Al-Nasr Tech ERP + E-Invoicing API",
        version = "0.1.0",
        description = "Arabic-first ERP + E-Invoicing system compliant with the Egyptian Tax Authority (ETA). \
            Features multi-tenant architecture, deterministic VAT calculation (14%), JWT authentication, \
            RSA-SHA256 signed e-invoices, and Row Level Security for tenant isolation.",
        contact(
            name = "Al-Nasr Tech Support",
            email = "support@alnasr.tech",
        ),
        license(
            name = "Proprietary",
        ),
    ),
    tags(
        (name = "Authentication", description = "Login, register, token refresh, and password management"),
        (name = "Customers", description = "Customer CRUD with tenant isolation and search"),
        (name = "Invoices", description = "Invoice lifecycle: draft → issued → submitted → accepted → paid"),
        (name = "Payments", description = "Payment recording with auto invoice status update"),
        (name = "Users", description = "Admin-only user management (requires admin role)"),
        (name = "Tenants", description = "Admin-only tenant/organization management (requires admin role)"),
        (name = "Audit Logs", description = "Read-only audit trail with filtering"),
        (name = "Analytics", description = "Dashboard, revenue, and trend reports"),
        (name = "E-Invoicing", description = "ETA token management and invoice submission"),
        (name = "System", description = "Health check and metrics endpoints"),
    ),
    modifiers(&SecurityAddon),
)]
pub struct ApiDoc;

/// Security addon that adds Bearer JWT auth to the OpenAPI spec.
struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::Http::new(
                        utoipa::openapi::security::HttpAuthScheme::Bearer,
                    ),
                ),
            );
        }
    }
}
