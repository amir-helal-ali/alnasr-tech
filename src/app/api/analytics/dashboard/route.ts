import { NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET() {
  try {
    const stats = db.getDashboardStats();
    return NextResponse.json({
      total_revenue: String(stats.totalRevenue),
      total_customers: stats.totalCustomers,
      total_invoices: stats.totalInvoices,
      pending_invoices: stats.pendingInvoices,
      paid_invoices: stats.paidInvoices,
      overdue_amount: '0',
      recent_invoices: stats.recentInvoices.map((inv: any) => ({
        id: inv.id, invoice_number: inv.invoiceNumber,
        customer: inv.customerName ? { name: inv.customerName, email: inv.customerEmail } : null,
        status: inv.status, total: String(inv.total), issue_date: inv.issueDate, due_date: inv.dueDate,
      })),
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ message: 'فشل في جلب الإحصائيات' }, { status: 500 });
  }
}
