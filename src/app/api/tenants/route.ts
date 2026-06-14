import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET() {
  try {
    const { data, total } = db.getTenants(1, 50);
    return NextResponse.json({
      data: data.map(t => ({
        id: t.id, name: t.name, name_ar: t.nameAr, subscription_plan: t.subscriptionPlan,
        is_active: !!t.isActive, created_at: t.createdAt, updated_at: t.updatedAt,
      })),
      total, page: 1, limit: 50, total_pages: 1,
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json({ message: 'فشل في جلب المؤسسات' }, { status: 500 });
  }
}
