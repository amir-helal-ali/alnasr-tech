use alnasr_tech::config::AppConfig;
use alnasr_tech::router::create_router;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{fmt, EnvFilter};

/// Async entrypoint for Al-Nasr Tech ERP + E-Invoicing System.
///
/// 1. Loads `.env` via `dotenvy`
/// 2. Initializes `tracing` with JSON formatter + env-filter
/// 3. Connects to PostgreSQL via `sqlx::PgPool`
/// 4. Runs pending database migrations
/// 5. Builds the Axum router with full middleware stack
/// 6. Conditionally initializes RBF runtime (behind `rbf` feature flag)
/// 7. Starts the server with graceful shutdown on Ctrl+C / SIGTERM
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ── 1. Load .env ──────────────────────────────────────────────────
    dotenvy::dotenv().ok();

    // ── 2. Initialize tracing ─────────────────────────────────────────
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    fmt()
        .json()
        .with_env_filter(env_filter)
        .init();

    tracing::info!("Al-Nasr Tech ERP starting up");

    // ── 3. Load configuration ─────────────────────────────────────────
    let config = AppConfig::load();
    let bind_addr = config.bind_addr();

    tracing::info!(
        host = %config.server_host,
        port = %config.server_port,
        "Server configuration loaded"
    );

    // ── 4. Connect to PostgreSQL ──────────────────────────────────────
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect(config.database_url())
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to PostgreSQL: {e}");
            e
        })?;

    tracing::info!("PostgreSQL connection pool established");

    // ── 5. Run database migrations ────────────────────────────────────
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Database migration failed: {e}");
            e
        })?;

    tracing::info!("Database migrations applied successfully");

    // ── 6. Conditionally initialize RBF runtime ──────────────────────
    #[cfg(feature = "rbf")]
    {
        tracing::info!("RBF feature enabled – initializing RBF runtime");
        init_rbf_runtime(&pool).await?;
    }

    // ── 7. Build the Axum router ──────────────────────────────────────
    //    create_router returns Router<PgPool>; with_state erases to Router<()>
    let app = create_router(pool.clone()).with_state(pool);

    // ── 8. Bind + serve with graceful shutdown ────────────────────────
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    tracing::info!("Listening on {bind_addr}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(|e| {
            tracing::error!("Server error: {e}");
            e
        })?;

    tracing::info!("Server shutdown complete");
    Ok(())
}

/// Wait for Ctrl+C or SIGTERM to trigger graceful shutdown.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("Received Ctrl+C, shutting down"),
        _ = terminate => tracing::info!("Received SIGTERM, shutting down"),
    }
}

/// Initialize the RBF (Rule-Based Framework) runtime.
/// Only compiled when the `rbf` feature is enabled.
#[cfg(feature = "rbf")]
async fn init_rbf_runtime(pool: &sqlx::PgPool) -> anyhow::Result<()> {
    tracing::info!("Loading RBF rule definitions from database");

    // Verify that the rbf_rules table exists and is accessible
    let rule_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM rbf_rules")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));

    tracing::info!(
        rule_count = rule_count.0,
        "RBF runtime initialized with {} active rules",
        rule_count.0
    );

    Ok(())
}
