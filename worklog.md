---
Task ID: 1
Agent: Super Z (Main)
Task: Rebuild Al-Nasr Tech ERP + E-Invoicing system from scratch

Work Log:
- Created full project directory structure at /home/z/my-project/alnasr-tech/
- Wrote Cargo.toml workspace with 7 members (main crate + 6 RBF crates)
- Wrote core files: main.rs (async entrypoint with graceful shutdown), lib.rs (15 modules), config.rs (AppConfig with SecretString), error.rs (AppError with thiserror), router.rs (Router<PgPool> with full middleware stack)
- Wrote auth.rs with full Argon2 + JWT + refresh token rotation implementation
- Wrote customers.rs with full CRUD + search + audit logging
- Wrote invoices.rs with full CRUD + tax engine integration + line items + CSV + audit
- Wrote payments.rs with full CRUD + invoice status tracking + audit
- Wrote users.rs with full CRUD + Argon2 password hashing
- Wrote tenants.rs with full CRUD + RLS policy management
- Wrote audit.rs with filtered query API
- Wrote analytics.rs with dashboard/revenue/trends endpoints
- Wrote einvoicing.rs with ETA OAuth2 + RSA-SHA256 signing + submission
- Wrote middleware.rs with auth + rate limiter + RLS context + Claims via Extension
- Wrote tax.rs with deterministic Decimal-based VAT calculations
- Wrote cache.rs with TTL-based in-memory cache
- Wrote metrics.rs with Prometheus integration
- Wrote email.rs with lettre 0.11 (MultiPart API)
- Wrote pdf.rs with printpdf 0.7 API
- Wrote email_handler.rs with welcome/invoice/reset email templates
- Wrote Docker setup: Dockerfile (Alpine multi-stage), docker-compose.yml, .env, .dockerignore
- Wrote migration: 20240101000000_initial_schema.sql (12 tables with RLS policies)
- Wrote 6 RBF crates: rbf-core, rbf-parser, rbf-codegen, rbf-runtime, rbf-plugin, rbf-cli
- Fixed 8+ compilation errors across 4 iterations:
  - tower-http: removed strict-transport-security feature (not in 0.5), used custom HSTS
  - lettre: disabled default-features for rustls compatibility
  - rust_decimal_macros: replaced with Decimal::new() API
  - axum::request: replaced with http::request::Request
  - FromRequestParts: switched to Extension<Claims> pattern
  - jsonwebtoken: ExpiredToken → ExpiredSignature
  - rsa: added SignatureEncoding import for to_bytes()
  - secrecy: expose_secret().to_string() for Credentials
  - ServiceBuilder body type: applied layers individually
  - std::net::TcpListener → tokio::net::TcpListener

Stage Summary:
- Full workspace builds with ZERO errors (29 warnings, all non-critical)
- Release binary: 15MB (target: <10MB — strip + UPX can reduce further)
- All 7 workspace crates compile successfully
- Project location: /home/z/my-project/alnasr-tech/
