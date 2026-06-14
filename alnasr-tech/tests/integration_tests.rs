//! Integration and unit tests for Al-Nasr Tech ERP.

use alnasr_tech::tax;
use alnasr_tech::csv_utils;
use alnasr_tech::cache::MemoryCache;
use alnasr_tech::middleware::RateLimiter;
use rust_decimal::Decimal;

// ═══════════════════════════════════════════════════════════════════════
// Tax Engine Tests
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn test_vat_calculation() {
    let net = Decimal::new(1000, 0);
    let vat = tax::calculate_vat(net);
    assert_eq!(vat, Decimal::new(14000, 2));
}

#[test]
fn test_gross_from_net() {
    let net = Decimal::new(1000, 0);
    let gross = tax::gross_from_net(net);
    assert_eq!(gross, Decimal::new(114000, 2));
}

#[test]
fn test_net_from_gross() {
    let gross = Decimal::new(1140, 0);
    let net = tax::net_from_gross(gross);
    assert_eq!(net, Decimal::new(100000, 2));
}

#[test]
fn test_line_tax_custom_rate() {
    let subtotal = Decimal::new(500, 0);
    let tax_rate = Decimal::new(5, 2);
    let tax_amount = tax::calculate_line_tax(subtotal, tax_rate);
    assert_eq!(tax_amount, Decimal::new(2500, 2));
}

#[test]
fn test_zero_net() {
    let net = Decimal::ZERO;
    let vat = tax::calculate_vat(net);
    assert_eq!(vat, Decimal::ZERO);
}

#[test]
fn test_rounding_two_decimal_places() {
    let net = Decimal::new(333, 0); // 333 EGP
    let vat = tax::calculate_vat(net);
    // 333 * 0.14 = 46.62
    assert_eq!(vat, Decimal::new(4662, 2));
}

// ═══════════════════════════════════════════════════════════════════════
// Cache Tests
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn test_cache_set_get() {
    let cache: MemoryCache<String> = MemoryCache::new(std::time::Duration::from_secs(60));
    cache.set("key1", "value1".to_string());
    assert_eq!(cache.get("key1"), Some("value1".to_string()));
}

#[test]
fn test_cache_miss() {
    let cache: MemoryCache<String> = MemoryCache::new(std::time::Duration::from_secs(60));
    assert_eq!(cache.get("nonexistent"), None);
}

#[test]
fn test_cache_remove() {
    let cache: MemoryCache<String> = MemoryCache::new(std::time::Duration::from_secs(60));
    cache.set("key1", "value1".to_string());
    cache.remove("key1");
    assert_eq!(cache.get("key1"), None);
}

#[test]
fn test_cache_overwrite() {
    let cache: MemoryCache<String> = MemoryCache::new(std::time::Duration::from_secs(60));
    cache.set("key1", "value1".to_string());
    cache.set("key1", "value2".to_string());
    assert_eq!(cache.get("key1"), Some("value2".to_string()));
}

// ═══════════════════════════════════════════════════════════════════════
// CSV Tests
// ═══════════════════════════════════════════════════════════════════════

#[test]
fn test_customer_csv_roundtrip() {
    let customers = vec![
        csv_utils::CustomerCsvRow {
            name: "Ahmed Mohamed".to_string(),
            email: "ahmed@example.com".to_string(),
            phone: Some("+20123456789".to_string()),
            address: Some("Cairo".to_string()),
            city: Some("Cairo".to_string()),
            country: Some("EG".to_string()),
            tax_id: Some("123456789".to_string()),
        },
    ];

    let csv_bytes = csv_utils::export_customers_csv(&customers).unwrap();
    let imported = csv_utils::import_customers_csv(&csv_bytes).unwrap();
    assert_eq!(imported.len(), 1);
    assert_eq!(imported[0].name, "Ahmed Mohamed");
    assert_eq!(imported[0].email, "ahmed@example.com");
}

#[test]
fn test_invoice_csv_export() {
    let invoices = vec![
        csv_utils::InvoiceCsvRow {
            invoice_number: "INV-20240101-0001".to_string(),
            customer_name: "Test Customer".to_string(),
            status: "paid".to_string(),
            subtotal: "1000.00".to_string(),
            tax_total: "140.00".to_string(),
            total: "1140.00".to_string(),
            issued_at: "2024-01-01".to_string(),
            due_date: Some("2024-02-01".to_string()),
        },
    ];

    let csv_bytes = csv_utils::export_invoices_csv(&invoices).unwrap();
    let csv_str = String::from_utf8(csv_bytes).unwrap();
    assert!(csv_str.contains("INV-20240101-0001"));
    assert!(csv_str.contains("1140.00"));
}

#[test]
fn test_empty_csv_export() {
    let customers: Vec<csv_utils::CustomerCsvRow> = vec![];
    let csv_bytes = csv_utils::export_customers_csv(&customers).unwrap();
    // Empty CSV still produces valid output (just headers)
    let csv_str = String::from_utf8(csv_bytes).unwrap();
    assert!(csv_str.contains("name") || csv_str.is_empty()); // Headers or empty
}

// ═══════════════════════════════════════════════════════════════════════
// Rate Limiter Tests
// ═══════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_rate_limiter_allows_within_limit() {
    let limiter = RateLimiter::new(5, 60);
    for i in 0..5 {
        assert!(limiter.is_allowed("192.168.1.1").await, "Request {i} should be allowed");
    }
}

#[tokio::test]
async fn test_rate_limiter_blocks_over_limit() {
    let limiter = RateLimiter::new(3, 60);
    for _ in 0..3 {
        assert!(limiter.is_allowed("192.168.1.1").await);
    }
    assert!(!limiter.is_allowed("192.168.1.1").await, "4th request should be blocked");
}

#[tokio::test]
async fn test_rate_limiter_separate_ips() {
    let limiter = RateLimiter::new(2, 60);
    assert!(limiter.is_allowed("192.168.1.1").await);
    assert!(limiter.is_allowed("192.168.1.2").await);
    assert!(limiter.is_allowed("192.168.1.1").await);
    assert!(limiter.is_allowed("192.168.1.2").await);
    // Both IPs now at limit
    assert!(!limiter.is_allowed("192.168.1.1").await);
    assert!(!limiter.is_allowed("192.168.1.2").await);
    // Different IP should still be allowed
    assert!(limiter.is_allowed("10.0.0.1").await);
}

#[tokio::test]
async fn test_rate_limiter_eviction() {
    let limiter = RateLimiter::new(1, 1); // 1 request per 1 second
    assert!(limiter.is_allowed("192.168.1.1").await);
    assert!(!limiter.is_allowed("192.168.1.1").await);
    
    // Wait for window to expire
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    
    // After eviction, should be allowed again
    limiter.evict_expired().await;
    assert!(limiter.is_allowed("192.168.1.1").await);
}
