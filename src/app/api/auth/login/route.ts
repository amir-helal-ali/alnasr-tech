import { NextRequest, NextResponse } from 'next/server';
import { db, simpleHash } from '@/lib/db-lite';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const user = db.findUserByEmail(email);
    if (!user || user.password !== simpleHash(password)) {
      return NextResponse.json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const accessToken = `at_${user.id}_${uuidv4()}`;
    const refreshToken = `${uuidv4()}-refresh-${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.createRefreshToken({ id: `rt_${uuidv4()}`, token: refreshToken, userId: user.id, expiresAt });
    db.deleteOldRefreshTokens(user.id, 5);

    const tenant = db.findTenantById(user.tenantId);

    const responseData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        tenant_id: user.tenantId,
        created_at: user.createdAt, updated_at: user.updatedAt,
      },
    };

    const response = NextResponse.json(responseData);
    response.cookies.set('auth_token', accessToken, {
      httpOnly: false, secure: false, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, path: '/',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'حدث خطأ في تسجيل الدخول' }, { status: 500 });
  }
}
