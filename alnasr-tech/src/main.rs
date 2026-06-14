use alnasr_tech::config::AppConfig;
use alnasr_tech::router::create_router;
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;
use tracing_subscriber::{fmt, EnvFilter};

/// Al-Nasr Tech ERP + E-Invoicing System
///
/// Production-grade async entrypoint with:
/// - Structured JSON logging with env-filter
/// - Database connection with retry logic (5 attempts)
/// - Automatic migration runner
/// - Connection pool tuning for 5k-10k concurrent users
/// - Graceful shutdown on SIGTERM / Ctrl+C
/// - RBF runtime behind feature gate
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ── 1. Load .env ──────────────────────────────────────────────────
    dotenvy::dotenv().ok();

    // ── 2. Initialize structured logging ──────────────────────────────
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("alnasr_tech=info,sqlx=warn,tower_http=warn"));

    fmt()
        .json()
        .with_env_filter(env_filter)
        .with_target(true)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .init();

    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        "Al-Nasr Tech ERP starting up"
    );

    // ── 3. Load configuration ─────────────────────────────────────────
    let config = AppConfig::load();
    let bind_addr = config.bind_addr();

    tracing::info!(
        host = %config.server_host,
        port = %config.server_port,
        jwt_expiration_secs = config.jwt_expiration_secs,
        "Server configuration loaded"
    );

    // ── 4. Connect to PostgreSQL with retry ───────────────────────────
    let pool = connect_with_retry(config.database_url()).await?;

    tracing::info!(
        pool_size = pool.size(),
        pool_idle = pool.num_idle(),
        "PostgreSQL connection pool established"
    );

    // ── 5. Run database migrations ────────────────────────────────────
    let migrate_result = sqlx::migrate!("./migrations")
        .run(&pool)
        .await;

    match migrate_result {
        Ok(_) => tracing::info!("Database migrations applied successfully"),
        Err(e) => {
            tracing::error!(error = %e, "Database migration failed");
            return Err(e.into());
        }
    }

    // ── 6. Conditionally initialize RBF runtime ──────────────────────
    #[cfg(feature = "rbf")]
    {
        tracing::info!("RBF feature enabled – initializing RBF runtime");
        init_rbf_runtime(&pool).await?;
    }

    #[cfg(not(feature = "rbf"))]
    {
        tracing::info!("RBF feature disabled – skipping RBF initialization");
    }

    // ── 7. Build the Axum router ──────────────────────────────────────
    let app = create_router(pool.clone()).with_state(pool);

    // ── 8. Bind + serve with graceful shutdown ────────────────────────
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    tracing::info!(addr = %bind_addr, "Server listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Server error");
            e
        })?;

    tracing::info!("Server shutdown complete");
    Ok(())
}

/// Connect to PostgreSQL with exponential backoff retry.
///
/// Retries up to 5 times with delays of 1s, 2s, 4s, 8s, 16s.
/// This ensures resilience during container startup when the DB
/// may not be immediately available.
async fn connect_with_retry(database_url: &str) -> anyhow::Result<sqlx::PgPool> {
    let max_retries = 5u32;
    let mut attempt = 0;

    loop {
        attempt += 1;

        match PgPoolOptions::new()
            .max_connections(20)
            .min_connections(5)
            .acquire_timeout(Duration::from_secs(10))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .connect(database_url)
            .await
        {
            Ok(pool) => {
                // Verify connectivity
                if sqlx::query_scalar::<_, i32>("SELECT 1")
                    .fetch_one(&pool)
                    .await
                    .is_ok()
                {
                    return Ok(pool);
                }
                tracing::warn!(attempt, "Database connected but health check failed");
            }
            Err(e) => {
                tracing::warn!(
                    attempt,
                    max_retries,
                    error = %e,
                    "Database connection attempt failed"
                );
            }
        }

        if attempt >= max_retries {
            anyhow::bail!("Failed to connect to PostgreSQL after {max_retries} attempts");
        }

        let delay = Duration::from_secs(2u64.pow(attempt - 1));
        tracing::info!(?delay, "Retrying database connection");
        tokio::time::sleep(delay).await;
    }
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
        _ = ctrl_c => tracing::info!("Received Ctrl+C, initiating graceful shutdown"),
        _ = terminate => tracing::info!("Received SIGTERM, initiating graceful shutdown"),
    }
}

/// Initialize the RBF (Rule-Based Framework) runtime.
#[cfg(feature = "rbf")]
async fn init_rbf_runtime(pool: &sqlx::PgPool) -> anyhow::Result<()> {
    tracing::info!("Loading RBF rule definitions from database");

    let rule_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM rbf_rules")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));

    tracing::info!(rule_count = rule_count.0, "RBF runtime initialized");

    Ok(())
}
