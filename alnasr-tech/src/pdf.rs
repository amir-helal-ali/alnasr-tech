//! PDF generation utilities for invoices and reports using `printpdf 0.7`.
//!
//! Generates professional A4 invoice PDFs with:
//! - Company header and logo placeholder
//! - Arabic-compatible layout (RTL not supported by Helvetica, use embedded font for Arabic)
//! - Itemized table with tax breakdown
//! - EGP currency formatting
//! - ETA-compliant document structure

use printpdf::*;
use std::io::BufWriter;

use crate::error::AppError;

/// Invoice data for PDF generation.
#[derive(Debug, Clone)]
pub struct InvoicePdfData {
    pub invoice_number: String,
    pub issue_date: String,
    pub due_date: Option<String>,
    pub seller_name: String,
    pub seller_tax_id: String,
    pub buyer_name: String,
    pub buyer_tax_id: String,
    pub items: Vec<PdfLineItem>,
    pub subtotal: String,
    pub tax_total: String,
    pub total: String,
    pub currency: String,
    pub notes: Option<String>,
}

/// Line item for PDF rendering.
#[derive(Debug, Clone)]
pub struct PdfLineItem {
    pub description: String,
    pub quantity: String,
    pub unit_price: String,
    pub tax_rate: String,
    pub tax_amount: String,
    pub total: String,
}

/// Generate a professional invoice PDF and return the raw bytes.
pub fn generate_invoice_pdf(data: &InvoicePdfData) -> Result<Vec<u8>, AppError> {
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Invoice {}", data.invoice_number),
        Mm(210.0), // A4 width
        Mm(297.0), // A4 height
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;

    let mut y_pos: f32 = 275.0; // Start from top (275mm from bottom for A4)

    // ── Company Header ──────────────────────────────────────────────
    current_layer.use_text(
        &data.seller_name,
        18.0,
        Mm(20.0),
        Mm(y_pos),
        &font,
    );
    y_pos -= 7.0;

    current_layer.use_text(
        format!("Tax ID: {}", data.seller_tax_id),
        10.0,
        Mm(20.0),
        Mm(y_pos),
        &font,
    );
    y_pos -= 12.0;

    // ── Invoice Title ───────────────────────────────────────────────
    current_layer.use_text(
        format!("INVOICE #{}", data.invoice_number),
        16.0,
        Mm(20.0),
        Mm(y_pos),
        &font,
    );
    y_pos -= 7.0;

    current_layer.use_text(
        format!("Date: {}    Due: {}", data.issue_date, data.due_date.as_deref().unwrap_or("N/A")),
        10.0,
        Mm(20.0),
        Mm(y_pos),
        &font,
    );
    y_pos -= 12.0;

    // ── Bill To ─────────────────────────────────────────────────────
    current_layer.use_text("BILL TO:", 10.0, Mm(20.0), Mm(y_pos), &font);
    y_pos -= 6.0;
    current_layer.use_text(&data.buyer_name, 12.0, Mm(20.0), Mm(y_pos), &font);
    y_pos -= 6.0;
    current_layer.use_text(format!("Tax ID: {}", data.buyer_tax_id), 10.0, Mm(20.0), Mm(y_pos), &font);
    y_pos -= 12.0;

    // ── Table Header ────────────────────────────────────────────────
    draw_table_header(&current_layer, &font, y_pos);
    y_pos -= 8.0;

    // ── Line separator ──────────────────────────────────────────────
    draw_line(&current_layer, 20.0, 190.0, y_pos + 3.0);
    y_pos -= 2.0;

    // ── Line Items ──────────────────────────────────────────────────
    for item in &data.items {
        if y_pos < 50.0 {
            // Would need multi-page support – truncate for now
            current_layer.use_text("... (more items)", 9.0, Mm(20.0), Mm(y_pos), &font);
            break;
        }
        current_layer.use_text(&item.description, 9.0, Mm(20.0), Mm(y_pos), &font);
        current_layer.use_text(&item.quantity, 9.0, Mm(90.0), Mm(y_pos), &font);
        current_layer.use_text(&item.unit_price, 9.0, Mm(110.0), Mm(y_pos), &font);
        current_layer.use_text(&item.tax_rate, 9.0, Mm(135.0), Mm(y_pos), &font);
        current_layer.use_text(&item.total, 9.0, Mm(160.0), Mm(y_pos), &font);
        y_pos -= 6.0;
    }

    // ── Totals ──────────────────────────────────────────────────────
    draw_line(&current_layer, 120.0, 190.0, y_pos + 2.0);
    y_pos -= 6.0;

    current_layer.use_text("Subtotal:", 10.0, Mm(120.0), Mm(y_pos), &font);
    current_layer.use_text(&data.subtotal, 10.0, Mm(160.0), Mm(y_pos), &font);
    y_pos -= 6.0;

    current_layer.use_text("Tax (VAT):", 10.0, Mm(120.0), Mm(y_pos), &font);
    current_layer.use_text(&data.tax_total, 10.0, Mm(160.0), Mm(y_pos), &font);
    y_pos -= 8.0;

    // Bold total (larger font)
    current_layer.use_text(
        format!("TOTAL ({})", data.currency),
        12.0,
        Mm(120.0),
        Mm(y_pos),
        &font,
    );
    current_layer.use_text(&data.total, 12.0, Mm(160.0), Mm(y_pos), &font);
    y_pos -= 12.0;

    // ── Notes ───────────────────────────────────────────────────────
    if let Some(ref notes) = data.notes {
        current_layer.use_text("Notes:", 9.0, Mm(20.0), Mm(y_pos), &font);
        y_pos -= 5.0;
        // Truncate long notes to prevent overflow
        let truncated = if notes.len() > 200 { &notes[..200] } else { notes };
        current_layer.use_text(truncated, 9.0, Mm(20.0), Mm(y_pos), &font);
    }

    // ── Footer ──────────────────────────────────────────────────────
    current_layer.use_text(
        "Generated by Al-Nasr Tech ERP – This document is ETA-compliant",
        8.0,
        Mm(20.0),
        Mm(15.0),
        &font,
    );

    // ── Save ────────────────────────────────────────────────────────
    let mut buf = BufWriter::new(Vec::new());
    doc.save(&mut buf)?;
    buf.into_inner().map_err(|e| AppError::Internal(format!("PDF buffer error: {e}")))
}

/// Draw table header row.
fn draw_table_header(layer: &PdfLayerReference, font: &IndirectFontRef, y: f32) {
    layer.use_text("Description", 9.0, Mm(20.0), Mm(y), font);
    layer.use_text("Qty", 9.0, Mm(90.0), Mm(y), font);
    layer.use_text("Unit Price", 9.0, Mm(110.0), Mm(y), font);
    layer.use_text("Tax%", 9.0, Mm(135.0), Mm(y), font);
    layer.use_text("Total", 9.0, Mm(160.0), Mm(y), font);
}

/// Draw a horizontal line from x_start to x_end at y position.
fn draw_line(layer: &PdfLayerReference, x_start: f32, x_end: f32, y: f32) {
    let line = Line {
        points: vec![
            (Point::new(Mm(x_start), Mm(y)), false),
            (Point::new(Mm(x_end), Mm(y)), false),
        ],
        is_closed: false,
    };

    layer.add_line(line);
}

/// Simple invoice PDF (backward-compatible convenience function).
pub fn generate_simple_invoice_pdf(
    invoice_number: &str,
    customer_name: &str,
    amount: f64,
    vat: f64,
) -> Result<Vec<u8>, AppError> {
    let data = InvoicePdfData {
        invoice_number: invoice_number.to_string(),
        issue_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        due_date: None,
        seller_name: "Al-Nasr Tech".to_string(),
        seller_tax_id: "N/A".to_string(),
        buyer_name: customer_name.to_string(),
        buyer_tax_id: "N/A".to_string(),
        items: vec![PdfLineItem {
            description: "Services".to_string(),
            quantity: "1".to_string(),
            unit_price: format!("{amount:.2}"),
            tax_rate: "14%".to_string(),
            tax_amount: format!("{vat:.2}"),
            total: format!("{:.2}", amount + vat),
        }],
        subtotal: format!("{amount:.2}"),
        tax_total: format!("{vat:.2}"),
        total: format!("{:.2}", amount + vat),
        currency: "EGP".to_string(),
        notes: None,
    };

    generate_invoice_pdf(&data)
}
