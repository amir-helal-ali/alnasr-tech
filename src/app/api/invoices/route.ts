import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') || '';
    const { data, total } = db.getInvoices(page, limit, status);
    return NextResponse.json({
      data: data.map(inv => ({
        id: inv.id, invoice_number: inv.invoiceNumber, customer_id: inv.customerId,
        customer: inv.customer, status: inv.status, issue_date: inv.issueDate,
        due_date: inv.dueDate, subtotal: String(inv.subtotal), tax_amount: String(inv.taxAmount),
        total: String(inv.total), notes: inv.notes, tenant_id: inv.tenantId,
        line_items: (inv.lineItems || []).map((li: any) => ({
          id: li.id, description: li.description, quantity: li.quantity,
          unit_price: String(li.unitPrice), tax_rate: String(li.taxRate),
          tax_amount: String(li.taxAmount), total: String(li.total),
        })),
        created_at: inv.createdAt, updated_at: inv.updatedAt,
      })),
      total, page, limit, total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ message: 'فشل في جلب الفواتير' }, { status: 500 });
  }
}
