//! Deterministic tax calculation engine for Egyptian VAT compliance.
//!
//! All calculations use `rust_decimal::Decimal` to guarantee determinism
//! and avoid floating-point rounding errors.

use rust_decimal::Decimal;

/// Egyptian standard VAT rate as a percentage string for DB storage.
pub const VAT_RATE_STR: &str = "14";

/// Egyptian standard VAT rate as a Decimal (14%).
pub fn vat_rate() -> Decimal {
    Decimal::new(14, 0) // 14%
}

/// Calculate line-item tax: `subtotal * tax_rate`.
///
/// `tax_rate` should be expressed as a fraction (e.g. 0.14 for 14%).
/// Returns the tax amount rounded to 2 decimal places.
pub fn calculate_line_tax(subtotal: Decimal, tax_rate: Decimal) -> Decimal {
    let tax = subtotal * tax_rate;
    tax.round_dp(2)
}

/// Calculate VAT amount from a net value at the standard 14% rate.
pub fn calculate_vat(net: Decimal) -> Decimal {
    calculate_line_tax(net, vat_rate() / Decimal::new(100, 0))
}

/// Calculate gross from net (net + VAT at 14%).
pub fn gross_from_net(net: Decimal) -> Decimal {
    (net * (Decimal::ONE + vat_rate() / Decimal::new(100, 0))).round_dp(2)
}

/// Calculate net from gross (gross / 1.14).
pub fn net_from_gross(gross: Decimal) -> Decimal {
    (gross / (Decimal::ONE + vat_rate() / Decimal::new(100, 0))).round_dp(2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_vat() {
        let net = Decimal::new(1000, 0);
        let vat = calculate_vat(net);
        assert_eq!(vat, Decimal::new(14000, 2));
    }

    #[test]
    fn test_gross_from_net() {
        let net = Decimal::new(1000, 0);
        let gross = gross_from_net(net);
        assert_eq!(gross, Decimal::new(114000, 2));
    }

    #[test]
    fn test_net_from_gross() {
        let gross = Decimal::new(1140, 0);
        let net = net_from_gross(gross);
        assert_eq!(net, Decimal::new(100000, 2));
    }
}
