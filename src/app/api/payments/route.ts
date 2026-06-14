import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const { data, total } = db.getPayments(page, limit);
    return NextResponse.json({
      data: data.map(p => ({
        id: p.id, invoice_id: p.invoiceId, amount: String(p.amount), method: p.method,
        reference: p.reference, notes: p.notes, paid_at: p.paidAt,
        tenant_id: p.tenantId, created_at: p.createdAt,
        invoice: p.invoiceNumber ? { id: p.invoiceId, invoice_number: p.invoiceNumber, customer: p.customerName ? { name: p.customerName } : null } : null,
      })),
      total, page, limit, total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json({ message: 'فشل في جلب المدفوعات' }, { status: 500 });
  }
}
