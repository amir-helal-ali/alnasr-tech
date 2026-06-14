import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const action = url.searchParams.get('action') || undefined;
    const entity = url.searchParams.get('entity') || undefined;
    const { data, total } = db.getAuditLogs(page, limit, action, entity);
    return NextResponse.json({
      data: data.map(l => ({
        id: l.id, user_id: l.userId, action: l.action, entity_type: l.entityType,
        entity_id: l.entityId, details: l.details, ip_address: l.ipAddress,
        created_at: l.createdAt,
      })),
      total, page, limit, total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ message: 'فشل في جلب سجل المراجعة' }, { status: 500 });
  }
}
