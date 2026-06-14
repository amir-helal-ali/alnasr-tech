//! PDF generation utilities for invoices and reports using `printpdf`.

use printpdf::*;
use std::io::BufWriter;

/// Generate a simple invoice PDF and return the raw bytes.
pub fn generate_invoice_pdf(
    invoice_number: &str,
    customer_name: &str,
    amount: f64,
    vat: f64,
) -> Result<Vec<u8>, crate::error::AppError> {
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Invoice {invoice_number}"),
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;

    // Invoice title
    current_layer.use_text(
        format!("INVOICE #{invoice_number}"),
        24.0,
        Mm(20.0),
        Mm(270.0),
        &font,
    );

    // Customer name
    current_layer.use_text(
        format!("Bill To: {customer_name}"),
        14.0,
        Mm(20.0),
        Mm(250.0),
        &font,
    );

    // Amount
    current_layer.use_text(
        format!("Subtotal: EGP {amount:.2}"),
        12.0,
        Mm(20.0),
        Mm(230.0),
        &font,
    );

    // VAT
    current_layer.use_text(
        format!("VAT (14%): EGP {vat:.2}"),
        12.0,
        Mm(20.0),
        Mm(220.0),
        &font,
    );

    // Total
    current_layer.use_text(
        format!("Total: EGP {:.2}", amount + vat),
        14.0,
        Mm(20.0),
        Mm(205.0),
        &font,
    );

    let mut buf = BufWriter::new(Vec::new());
    doc.save(&mut buf)?;
    Ok(buf.into_inner().map_err(|e| crate::error::AppError::Internal(format!("PDF buffer error: {e}")))?)
}
