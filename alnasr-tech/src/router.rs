use axum::{Router, extract::State, routing::get};
use prometheus::{
    Encoder, TextEncoder, Registry, Opts, Counter, Histogram, Gauge,
    core::Collector,
    proto::MetricFamily,
};
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;
use tower_http::cors::{CorsLayer, Any};
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::compression::CompressionLayer;

use crate::auth;
use crate::customers;
use crate::invoices;
use crate::payments;
use crate::users;
use crate::tenants;
use crate::audit;
use crate::analytics;
use crate::einvoicing;

// ── Custom Prometheus collector ─────────────────────────────────────────

/// A custom collector that exposes database pool statistics.
///
/// Implements `prometheus::core::Collector` to demonstrate how custom
/// collectors integrate with the Prometheus registry. Internally delegates
/// to standard `Gauge` metrics that are shared with the rest of the app.
pub struct PoolStatsCollector {
    pool_size_gauge: Gauge,
    pool_idle_gauge: Gauge,
}

impl PoolStatsCollector {
    /// Create a new collector and return it along with cloneable gauge handles
    /// that can be updated from anywhere in the application.
    pub fn new(pool: &PgPool) -> Self {
        let pool_size_gauge = Gauge::with_opts(Opts::new(
            "db_pool_size",
            "Total number of connections in the database pool",
        ))
        .expect("cannot create db_pool_size gauge");

        let pool_idle_gauge = Gauge::with_opts(Opts::new(
            "db_pool_idle",
            "Number of idle connections in the database pool",
        ))
        .expect("cannot create db_pool_idle gauge");

        // Set initial values
        pool_size_gauge.set(pool.size() as f64);
        pool_idle_gauge.set(pool.num_idle() as f64);

        Self {
            pool_size_gauge,
            pool_idle_gauge,
        }
    }

    /// Obtain a clone of the pool-size gauge handle for live updates.
    pub fn pool_size_gauge(&self) -> Gauge {
        self.pool_size_gauge.clone()
    }

    /// Obtain a clone of the pool-idle gauge handle for live updates.
    pub fn pool_idle_gauge(&self) -> Gauge {
        self.pool_idle_gauge.clone()
    }
}

impl Collector for PoolStatsCollector {
    fn desc(&self) -> Vec<&prometheus::core::Desc> {
        let mut descs = Vec::new();
        descs.extend(self.pool_size_gauge.desc());
        descs.extend(self.pool_idle_gauge.desc());
        descs
    }

    fn collect(&self) -> Vec<MetricFamily> {
        let mut families = Vec::new();
        families.extend(self.pool_size_gauge.collect());
        families.extend(self.pool_idle_gauge.collect());
        families
    }
}

// ── Prometheus metrics (global, lazily initialized) ────────────────────

/// Application-level metrics shared across all handlers.
#[derive(Debug, Clone)]
pub struct AppMetrics {
    pub registry: Arc<Registry>,
    pub http_requests_total: Counter,
    pub http_request_duration_seconds: Histogram,
    pub active_connections: Gauge,
}

impl AppMetrics {
    /// Create and register all standard application metrics.
    pub fn new() -> Self {
        let registry = Arc::new(Registry::new());

        let http_requests_total = Counter::with_opts(Opts::new(
            "http_requests_total",
            "Total number of HTTP requests received",
        ))
        .expect("cannot create http_requests_total counter");

        let http_request_duration_seconds = Histogram::with_opts(
            prometheus::HistogramOpts::new(
                "http_request_duration_seconds",
                "HTTP request duration in seconds",
            )
            .buckets(vec![
                0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
            ]),
        )
        .expect("cannot create http_request_duration_seconds histogram");

        let active_connections = Gauge::with_opts(Opts::new(
            "active_connections",
            "Number of active database connections",
        ))
        .expect("cannot create active_connections gauge");

        registry
            .register(Box::new(http_requests_total.clone()))
            .expect("cannot register http_requests_total");
        registry
            .register(Box::new(http_request_duration_seconds.clone()))
            .expect("cannot register http_request_duration_seconds");
        registry
            .register(Box::new(active_connections.clone()))
            .expect("cannot register active_connections");

        Self {
            registry,
            http_requests_total,
            http_request_duration_seconds,
            active_connections,
        }
    }
}

/// Global metrics instance — initialized once on first access.
static METRICS: std::sync::LazyLock<AppMetrics> = std::sync::LazyLock::new(AppMetrics::new);

/// Obtain a reference to the global `AppMetrics`.
pub fn global_metrics() -> &'static AppMetrics {
    &METRICS
}

// ── Router construction ────────────────────────────────────────────────

/// Build the complete Axum router with all modules and middleware.
///
/// The router is constructed with `Router<PgPool>` state — `with_state`
/// should be called by the caller (main.rs) right before serving:
///
/// ```rust,ignore
/// let app = create_router(pool).with_state(pool);
/// axum::serve(listener, app).await?;
/// ```
pub fn create_router(pool: PgPool) -> Router<PgPool> {
    // Ensure metrics are initialized on first router creation
    let _ = &*METRICS;

    // Record initial active-connections gauge from the pool
    METRICS.active_connections.set(pool.size() as f64);

    // Register the custom pool-stats collector
    let pool_collector = PoolStatsCollector::new(&pool);
    METRICS
        .registry
        .register(Box::new(pool_collector))
        .expect("cannot register PoolStatsCollector");

    // ── CORS (permissive – tighten for production) ─────────────────────

    // ── Assemble routes with middleware ───────────────────────────────
    Router::new()
        // Health check
        .route("/health", get(health_handler))
        // Prometheus metrics
        .route("/metrics", get(metrics_handler))
        // Domain modules
        .merge(auth::router())
        .merge(customers::router())
        .merge(invoices::router())
        .merge(payments::router())
        .merge(users::router())
        .merge(tenants::router())
        .merge(audit::router())
        .merge(analytics::router())
        .merge(einvoicing::router())
        // Apply middleware layers individually (avoids body type compatibility issues)
        .layer(CompressionLayer::new())
        .layer(CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any))
        .layer(TraceLayer::new_for_http())
        .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024))
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
}

// ── Handlers ───────────────────────────────────────────────────────────

async fn health_handler(State(pool): State<PgPool>) -> axum::Json<serde_json::Value> {
    // Quick DB connectivity check
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&pool)
        .await
        .is_ok();

    axum::Json(serde_json::json!({
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
    }))
}

async fn metrics_handler() -> String {
    let encoder = TextEncoder::new();
    let metric_families = METRICS.registry.gather();
    let mut buffer = Vec::new();
    encoder.encode(&metric_families, &mut buffer).unwrap();
    String::from_utf8(buffer).unwrap_or_default()
}
