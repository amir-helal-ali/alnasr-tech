import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'غير مصرح' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Extract user ID from our custom access token format: at_{userId}_{random}
    if (!token.startsWith('at_')) {
      return NextResponse.json(
        { message: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    const parts = token.split('_');
    if (parts.length < 3) {
      return NextResponse.json(
        { message: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    const userId = parts[1];

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'المستخدم غير موجود' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant_id: user.tenantId,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
