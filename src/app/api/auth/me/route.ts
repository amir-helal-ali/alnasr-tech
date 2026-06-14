import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

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

    // Try Rust backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      }

      // Backend returned error
      if (backendRes.status === 401) {
        return NextResponse.json(
          { message: 'غير مصرح' },
          { status: 401 }
        );
      }
      // Fall through to demo mode on other errors
    } catch {
      console.warn('Backend unreachable, using demo mode');
    }

    // Demo mode fallback
    const { db } = await import('@/lib/db');

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
