import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token.startsWith('at_')) {
      return NextResponse.json({ message: 'رمز غير صالح' }, { status: 401 });
    }

    const parts = token.split('_');
    if (parts.length < 3) {
      return NextResponse.json({ message: 'رمز غير صالح' }, { status: 401 });
    }

    const userId = parts[1];
    const user = db.findUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'المستخدم غير موجود' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id, name: user.name, email: user.email, role: user.role,
      tenant_id: user.tenantId, created_at: user.createdAt, updated_at: user.updatedAt,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ message: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
