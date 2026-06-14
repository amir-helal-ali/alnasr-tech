import { NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET() {
  try {
    const stats = db.getDashboardStats();
    return NextResponse.json([
      { month: '2024-06', revenue: String(stats.totalRevenue), count: stats.totalInvoices },
    ]);
  } catch (error) {
    console.error('Get revenue error:', error);
    return NextResponse.json({ message: 'فشل في جلب بيانات الإيرادات' }, { status: 500 });
  }
}
