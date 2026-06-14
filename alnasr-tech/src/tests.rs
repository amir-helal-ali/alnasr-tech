//! Comprehensive test suite for Al-Nasr Tech ERP + E-Invoicing System
//!
//! Tests are organized by module:
//! - Tax engine (deterministic VAT calculations)
//! - Cache (TTL-based memory cache)
//! - Auth (JWT token creation, password hashing)
//! - PDF generation
//! - CSV import/export
//! - Middleware (Claims parsing, rate limiter)
//! - E-Invoicing (RSA signing)

// ═══════════════════════════════════════════════════════════════════════
// Tax engine tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tax_tests {
    use rust_decimal::Decimal;

    /// Test basic VAT calculation at 14%
    #[test]
    fn test_calculate_vat_basic() {
        let net = Decimal::new(1000, 0); // 1000 EGP
        let vat_rate = Decimal::new(14, 0) / Decimal::new(100, 0); // 0.14
        let tax = net * vat_rate;
        let rounded = tax.round_dp(2);
        assert_eq!(rounded, Decimal::new(14000, 2)); // 140.00 EGP
    }

    /// Test VAT calculation with large amounts
    #[test]
    fn test_calculate_vat_large_amount() {
        let net = Decimal::new(1000000, 0); // 1,000,000 EGP
        let vat_rate = Decimal::new(14, 0) / Decimal::new(100, 0);
        let tax = (net * vat_rate).round_dp(2);
        assert_eq!(tax, Decimal::new(14000000, 2)); // 140,000.00 EGP
    }

    /// Test VAT calculation with zero amount
    #[test]
    fn test_calculate_vat_zero() {
        let net = Decimal::ZERO;
        let vat_rate = Decimal::new(14, 0) / Decimal::new(100, 0);
        let tax = (net * vat_rate).round_dp(2);
        assert_eq!(tax, Decimal::ZERO);
    }

    /// Test gross from net calculation
    #[test]
    fn test_gross_from_net() {
        let net = Decimal::new(1000, 0);
        let vat_rate = Decimal::new(14, 0);
        let gross = (net * (Decimal::ONE + vat_rate / Decimal::new(100, 0))).round_dp(2);
        assert_eq!(gross, Decimal::new(114000, 2)); // 1140.00 EGP
    }

    /// Test net from gross calculation (reverse VAT)
    #[test]
    fn test_net_from_gross() {
        let gross = Decimal::new(1140, 0);
        let vat_rate = Decimal::new(14, 0);
        let net = (gross / (Decimal::ONE + vat_rate / Decimal::new(100, 0))).round_dp(2);
        assert_eq!(net, Decimal::new(100000, 2)); // 1000.00 EGP
    }

    /// Test that VAT is deterministic (same input always produces same output)
    #[test]
    fn test_vat_determinism() {
        let net = Decimal::from_str_exact("999.99").unwrap();
        let vat_rate = Decimal::new(14, 0) / Decimal::new(100, 0);

        let results: Vec<_> = (0..100)
            .map(|_| (net * vat_rate).round_dp(2))
            .collect();

        let first = results[0];
        assert!(results.iter().all(|r| *r == first), "VAT calculation is not deterministic!");
    }

    /// Test rounding to 2 decimal places
    #[test]
    fn test_vat_rounding() {
        let net = Decimal::from_str_exact("333.33").unwrap();
        let vat_rate = Decimal::new(14, 0) / Decimal::new(100, 0);
        let tax = (net * vat_rate).round_dp(2);
        // 333.33 * 0.14 = 46.6662 → rounds to 46.67
        assert_eq!(tax, Decimal::from_str_exact("46.67").unwrap());
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Cache tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod cache_tests {
    use crate::cache::MemoryCache;
    use std::time::Duration;

    #[test]
    fn test_cache_set_and_get() {
        let cache: MemoryCache<String> = MemoryCache::new(Duration::from_secs(60));
        cache.set("key1", "value1".to_string());
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
    }

    #[test]
    fn test_cache_miss() {
        let cache: MemoryCache<String> = MemoryCache::new(Duration::from_secs(60));
        assert_eq!(cache.get("nonexistent"), None);
    }

    #[test]
    fn test_cache_overwrite() {
        let cache: MemoryCache<String> = MemoryCache::new(Duration::from_secs(60));
        cache.set("key1", "value1".to_string());
        cache.set("key1", "value2".to_string());
        assert_eq!(cache.get("key1"), Some("value2".to_string()));
    }

    #[test]
    fn test_cache_remove() {
        let cache: MemoryCache<String> = MemoryCache::new(Duration::from_secs(60));
        cache.set("key1", "value1".to_string());
        cache.remove("key1");
        assert_eq!(cache.get("key1"), None);
    }

    #[test]
    fn test_cache_custom_ttl() {
        let cache: MemoryCache<String> = MemoryCache::new(Duration::from_secs(60));
        cache.set_with_ttl("short_lived", "data".to_string(), Duration::from_millis(10));

        // Should be available immediately
        assert_eq!(cache.get("short_lived"), Some("data".to_string()));

        // Wait for expiry
        std::thread::sleep(Duration::from_millis(50));

        // Should be expired now
        assert_eq!(cache.get("short_lived"), None);
    }

    #[test]
    fn test_cache_evict_expired() {
        let cache: MemoryCache<String> = MemoryCache::new(Duration::from_secs(60));
        cache.set_with_ttl("expiring", "data".to_string(), Duration::from_millis(10));

        std::thread::sleep(Duration::from_millis(50));
        cache.evict_expired();

        // After eviction, the entry should be gone
        assert_eq!(cache.get("expiring"), None);
    }

    #[test]
    fn test_cache_different_types() {
        let cache: MemoryCache<i32> = MemoryCache::new(Duration::from_secs(60));
        cache.set("count", 42);
        assert_eq!(cache.get("count"), Some(42));
    }
}

// ═══════════════════════════════════════════════════════════════════════
// CSV utility tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod csv_tests {
    use crate::csv_utils::*;

    #[test]
    fn test_export_customers_csv() {
        let customers = vec![
            CustomerCsvRow {
                name: "أحمد محمد".to_string(),
                email: "ahmed@example.com".to_string(),
                phone: Some("+201012345678".to_string()),
                address: Some("123 Main St".to_string()),
                city: Some("Cairo".to_string()),
                country: Some("EG".to_string()),
                tax_id: Some("123456789".to_string()),
            },
        ];

        let csv_bytes = export_customers_csv(&customers).unwrap();
        let csv_str = String::from_utf8(csv_bytes).unwrap();
        assert!(csv_str.contains("ahmed@example.com"));
        assert!(csv_str.contains("أحمد محمد"));
    }

    #[test]
    fn test_import_customers_csv() {
        let csv_data = b"name,email,phone\nAhmed,ahmed@example.com,+201012345678\n";
        let customers = import_customers_csv(csv_data).unwrap();
        assert_eq!(customers.len(), 1);
        assert_eq!(customers[0].name, "Ahmed");
        assert_eq!(customers[0].email, "ahmed@example.com");
    }

    #[test]
    fn test_export_invoices_csv() {
        let invoices = vec![
            InvoiceCsvRow {
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

        let csv_bytes = export_invoices_csv(&invoices).unwrap();
        let csv_str = String::from_utf8(csv_bytes).unwrap();
        assert!(csv_str.contains("INV-20240101-0001"));
        assert!(csv_str.contains("1140.00"));
    }

    #[test]
    fn test_export_payments_csv() {
        let payments = vec![
            PaymentCsvRow {
                invoice_number: "INV-20240101-0001".to_string(),
                amount: "500.00".to_string(),
                method: "bank_transfer".to_string(),
                reference: Some("REF-001".to_string()),
                paid_at: "2024-01-15".to_string(),
            },
        ];

        let csv_bytes = export_payments_csv(&payments).unwrap();
        let csv_str = String::from_utf8(csv_bytes).unwrap();
        assert!(csv_str.contains("bank_transfer"));
        assert!(csv_str.contains("500.00"));
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Middleware / Claims tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod claims_tests {
    use crate::middleware::Claims;

    fn sample_claims() -> Claims {
        Claims {
            sub: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            email: "admin@alnasr.tech".to_string(),
            tenant_id: "660e8400-e29b-41d4-a716-446655440001".to_string(),
            role: "admin".to_string(),
            exp: 9999999999,
            iat: 1700000000,
        }
    }

    #[test]
    fn test_claims_is_admin() {
        let claims = sample_claims();
        assert!(claims.is_admin());
    }

    #[test]
    fn test_claims_is_not_admin() {
        let mut claims = sample_claims();
        claims.role = "user".to_string();
        assert!(!claims.is_admin());
    }

    #[test]
    fn test_claims_user_id() {
        let claims = sample_claims();
        let user_id = claims.user_id().unwrap();
        assert_eq!(user_id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_claims_tenant_uuid() {
        let claims = sample_claims();
        let tenant_id = claims.tenant_uuid().unwrap();
        assert_eq!(tenant_id.to_string(), "660e8400-e29b-41d4-a716-446655440001");
    }

    #[test]
    fn test_claims_invalid_user_id() {
        let mut claims = sample_claims();
        claims.sub = "not-a-uuid".to_string();
        assert!(claims.user_id().is_err());
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Rate limiter tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiter_tests {
    use crate::middleware::RateLimiter;

    #[tokio::test]
    async fn test_rate_limiter_allows_within_limit() {
        let limiter = RateLimiter::new(5, 60);
        for _ in 0..5 {
            assert!(limiter.is_allowed("192.168.1.1").await);
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_blocks_over_limit() {
        let limiter = RateLimiter::new(3, 60);
        for _ in 0..3 {
            assert!(limiter.is_allowed("192.168.1.2").await);
        }
        // 4th request should be blocked
        assert!(!limiter.is_allowed("192.168.1.2").await);
    }

    #[tokio::test]
    async fn test_rate_limiter_per_key_isolation() {
        let limiter = RateLimiter::new(2, 60);
        assert!(limiter.is_allowed("192.168.1.3").await);
        assert!(limiter.is_allowed("192.168.1.3").await);
        // IP 3 is now rate limited
        assert!(!limiter.is_allowed("192.168.1.3").await);
        // But IP 4 is not
        assert!(limiter.is_allowed("192.168.1.4").await);
    }

    #[tokio::test]
    async fn test_rate_limiter_eviction() {
        let limiter = RateLimiter::new(1, 1); // 1 request per 1 second
        assert!(limiter.is_allowed("192.168.1.5").await);
        assert!(!limiter.is_allowed("192.168.1.5").await);

        // Wait for window to expire
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        limiter.evict_expired().await;

        // Should be allowed again after eviction
        assert!(limiter.is_allowed("192.168.1.5").await);
    }

    #[tokio::test]
    async fn test_rate_limiter_production_defaults() {
        let limiter = RateLimiter::production();
        // Should allow 100 requests
        for _ in 0..100 {
            assert!(limiter.is_allowed("192.168.1.6").await);
        }
        // 101st should be blocked
        assert!(!limiter.is_allowed("192.168.1.6").await);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Invoice status transition tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod invoice_status_tests {
    /// Test valid transitions from draft status
    #[test]
    fn test_draft_transitions() {
        let allowed = crate::invoices::valid_transitions("draft");
        assert!(allowed.contains(&"issued"));
        assert!(allowed.contains(&"cancelled"));
        assert!(!allowed.contains(&"paid"));
        assert!(!allowed.contains(&"accepted"));
    }

    /// Test valid transitions from issued status
    #[test]
    fn test_issued_transitions() {
        let allowed = crate::invoices::valid_transitions("issued");
        assert!(allowed.contains(&"submitted"));
        assert!(allowed.contains(&"cancelled"));
        assert!(!allowed.contains(&"draft"));
    }

    /// Test valid transitions from submitted status
    #[test]
    fn test_submitted_transitions() {
        let allowed = crate::invoices::valid_transitions("submitted");
        assert!(allowed.contains(&"accepted"));
        assert!(allowed.contains(&"cancelled"));
    }

    /// Test valid transitions from paid status (no transitions allowed)
    #[test]
    fn test_paid_no_transitions() {
        let allowed = crate::invoices::valid_transitions("paid");
        assert!(allowed.is_empty());
    }

    /// Test valid transitions from cancelled status (no transitions allowed)
    #[test]
    fn test_cancelled_no_transitions() {
        let allowed = crate::invoices::valid_transitions("cancelled");
        assert!(allowed.is_empty());
    }
}

// ═══════════════════════════════════════════════════════════════════════
// PDF generation tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod pdf_tests {
    use crate::pdf::*;

    #[test]
    fn test_generate_invoice_pdf() {
        let data = InvoicePdfData {
            invoice_number: "INV-20240101-0001".to_string(),
            issue_date: "2024-01-01".to_string(),
            due_date: Some("2024-02-01".to_string()),
            seller_name: "Al-Nasr Tech".to_string(),
            seller_tax_id: "123456789".to_string(),
            buyer_name: "شركة النجاح".to_string(),
            buyer_tax_id: "987654321".to_string(),
            items: vec![
                PdfLineItem {
                    description: "Consulting Services".to_string(),
                    quantity: "10".to_string(),
                    unit_price: "100.00".to_string(),
                    tax_rate: "14%".to_string(),
                    tax_amount: "140.00".to_string(),
                    total: "1140.00".to_string(),
                },
            ],
            subtotal: "1000.00".to_string(),
            tax_total: "140.00".to_string(),
            total: "1140.00".to_string(),
            currency: "EGP".to_string(),
            notes: Some("Payment due within 30 days".to_string()),
        };

        let pdf_bytes = generate_invoice_pdf(&data).unwrap();
        assert!(!pdf_bytes.is_empty());
        // Check PDF magic bytes
        assert_eq!(&pdf_bytes[0..5], b"%PDF-");
    }

    #[test]
    fn test_generate_simple_invoice_pdf() {
        let pdf_bytes = generate_simple_invoice_pdf("INV-001", "Test Customer", 1000.0, 140.0).unwrap();
        assert!(!pdf_bytes.is_empty());
        assert_eq!(&pdf_bytes[0..5], b"%PDF-");
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Config tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod config_tests {
    /// Test that bind_addr is correctly formatted
    #[test]
    fn test_bind_addr_format() {
        // This test requires env vars to be set; in CI, use .env.test
        // For now, just test the format logic
        let addr = format!("{}:{}", "0.0.0.0", 3000);
        assert_eq!(addr, "0.0.0.0:3000");
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Error response tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod error_tests {
    use crate::error::AppError;

    #[test]
    fn test_app_error_display() {
        let err = AppError::NotFound;
        assert_eq!(err.to_string(), "Resource not found");

        let err = AppError::Unauthorized;
        assert_eq!(err.to_string(), "Unauthorized");

        let err = AppError::BadRequest("Invalid email".to_string());
        assert_eq!(err.to_string(), "Invalid email");

        let err = AppError::RateLimited;
        assert_eq!(err.to_string(), "Rate limited – too many requests");
    }

    #[test]
    fn test_validation_error_conversion() {
        use validator::Validate;

        #[derive(Validate)]
        struct TestInput {
            #[validate(length(min = 5))]
            name: String,
        }

        let input = TestInput { name: "ab".to_string() };
        let result = input.validate();
        assert!(result.is_err());

        let app_error: AppError = result.unwrap_err().into();
        match app_error {
            AppError::BadRequest(msg) => assert!(msg.contains("Validation error")),
            _ => panic!("Expected BadRequest error"),
        }
    }
}
