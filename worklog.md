---
Task ID: 2
Agent: Main
Task: Production-readiness improvements (continued from context reset)

Work Log:
- Fixed all 13 clippy warnings: removed useless .into() in config.rs, added Default impl for AppMetrics, updated MSRV to 1.80 for LazyLock, fixed needless borrow in email.rs, fixed needless Ok(? patterns in pdf.rs and csv_utils.rs
- Fixed critical bug: admin routes were missing auth_middleware - only had admin_only_middleware which depends on Claims from auth_middleware. Added both layers in correct order.
- Added invoice_line_items RLS policy in migration (was enabled for RLS but missing the policy)
- Added reqwest::Error conversion to AppError for proper ETA API error handling
- Added utoipa + utoipa-swagger-ui as optional "swagger" feature (feature-gated to keep binary small in production)
- Created api_docs.rs module with OpenAPI 3.0 spec, security scheme (Bearer JWT), and tagged API groups
- Added CSV export endpoints: GET /api/customers/export and GET /api/invoices/export
- Added InvoiceCsvRow sqlx::FromRow derive for query_as
- Added graceful DB pool cleanup (pool.close().await) on shutdown
- Added background rate-limiter eviction task (runs every 5 minutes)
- Fixed rbf-cli dead_code warning by splitting into lib.rs (pub fn run()) + main.rs
- Updated Dockerfile from rust:1.75-alpine to rust:1.80-alpine
- Created .env.example with documented production configuration template

Stage Summary:
- Zero clippy warnings from project code
- 58 tests passing (41 unit + 17 integration)
- Release binary: 6.1MB (without swagger), 17MB (with swagger feature)
- rbf-cli binary: 557KB
- Full workspace release build passing
- Critical auth bug fixed (admin routes)
- RLS policy gap fixed (invoice_line_items)
- OpenAPI docs available at /api/docs (when swagger feature enabled)
- CSV export endpoints for customers and invoices
- Background tasks for maintenance (rate limiter eviction)
- Graceful shutdown with pool cleanup
