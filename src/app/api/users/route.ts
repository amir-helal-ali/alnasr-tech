import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET() {
  try {
    const { data, total } = db.getUsers(1, 50);
    return NextResponse.json({
      data: data.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        tenant_id: u.tenantId, created_at: u.createdAt, updated_at: u.updatedAt,
      })),
      total, page: 1, limit: 50, total_pages: 1,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ message: 'فشل في جلب المستخدمين' }, { status: 500 });
  }
}
