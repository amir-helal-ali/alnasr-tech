//! CSV export/import utilities for invoices and customers.

use crate::error::AppError;
use serde::{Deserialize, Serialize};

// ── Customer CSV ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerCsvRow {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub tax_id: Option<String>,
}

/// Export customers to CSV bytes.
pub fn export_customers_csv(customers: &[CustomerCsvRow]) -> Result<Vec<u8>, AppError> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    for customer in customers {
        wtr.serialize(customer).map_err(|e| AppError::Internal(format!("CSV serialize error: {e}")))?;
    }
    wtr.flush().map_err(|e| AppError::Internal(format!("CSV flush error: {e}")))?;
    Ok(wtr.into_inner().map_err(|e| AppError::Internal(format!("CSV writer error: {e}")))?)
}

/// Import customers from CSV bytes.
pub fn import_customers_csv(csv_data: &[u8]) -> Result<Vec<CustomerCsvRow>, AppError> {
    let mut rdr = csv::Reader::from_reader(csv_data);
    let mut customers = Vec::new();
    for result in rdr.deserialize() {
        let customer: CustomerCsvRow = result.map_err(|e| AppError::BadRequest(format!("CSV parse error: {e}")))?;
        customers.push(customer);
    }
    Ok(customers)
}

// ── Invoice CSV ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceCsvRow {
    pub invoice_number: String,
    pub customer_name: String,
    pub status: String,
    pub subtotal: String,
    pub tax_total: String,
    pub total: String,
    pub issued_at: String,
    pub due_date: Option<String>,
}

/// Export invoices to CSV bytes.
pub fn export_invoices_csv(invoices: &[InvoiceCsvRow]) -> Result<Vec<u8>, AppError> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    for invoice in invoices {
        wtr.serialize(invoice).map_err(|e| AppError::Internal(format!("CSV serialize error: {e}")))?;
    }
    wtr.flush().map_err(|e| AppError::Internal(format!("CSV flush error: {e}")))?;
    Ok(wtr.into_inner().map_err(|e| AppError::Internal(format!("CSV writer error: {e}")))?)
}

/// Import invoices from CSV bytes.
pub fn import_invoices_csv(csv_data: &[u8]) -> Result<Vec<InvoiceCsvRow>, AppError> {
    let mut rdr = csv::Reader::from_reader(csv_data);
    let mut invoices = Vec::new();
    for result in rdr.deserialize() {
        let invoice: InvoiceCsvRow = result.map_err(|e| AppError::BadRequest(format!("CSV parse error: {e}")))?;
        invoices.push(invoice);
    }
    Ok(invoices)
}

// ── Payment CSV ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentCsvRow {
    pub invoice_number: String,
    pub amount: String,
    pub method: String,
    pub reference: Option<String>,
    pub paid_at: String,
}

/// Export payments to CSV bytes.
pub fn export_payments_csv(payments: &[PaymentCsvRow]) -> Result<Vec<u8>, AppError> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    for payment in payments {
        wtr.serialize(payment).map_err(|e| AppError::Internal(format!("CSV serialize error: {e}")))?;
    }
    wtr.flush().map_err(|e| AppError::Internal(format!("CSV flush error: {e}")))?;
    Ok(wtr.into_inner().map_err(|e| AppError::Internal(format!("CSV writer error: {e}")))?)
}
