//! Al-Nasr Tech ERP + E-Invoicing System
//!
//! Library root that declares all public modules.

pub mod config;
pub mod error;
pub mod router;

// ── Domain modules ────────────────────────────────────────────────────
pub mod auth;
pub mod customers;
pub mod invoices;
pub mod payments;
pub mod users;
pub mod tenants;
pub mod audit;
pub mod analytics;
pub mod einvoicing;

// ── Infrastructure modules ────────────────────────────────────────────
pub mod tax;
pub mod cache;
pub mod metrics;
pub mod email;
pub mod pdf;
pub mod email_handler;
pub mod middleware;
pub mod csv_utils;

// ── Tests ──────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests;
