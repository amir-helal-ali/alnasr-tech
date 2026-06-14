import { NextRequest, NextResponse } from 'next/server';
import { db, simpleHash } from '@/lib/db-lite';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, tenant_name } = body;

    if (!name || !email || !password || !tenant_name) {
      return NextResponse.json({ message: 'جميع الحقول مطلوبة' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ message: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
    }

    const tenantId = `tenant_${uuidv4()}`;
    db.createTenant({ id: tenantId, name: tenant_name, subscriptionPlan: 'free', isActive: 1 });

    const userId = `user_${uuidv4()}`;
    db.createUser({ id: userId, name, email, password: simpleHash(password), role: 'admin', tenantId });

    const accessToken = `at_${userId}_${uuidv4()}`;
    const refreshToken = `${uuidv4()}-refresh-${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.createRefreshToken({ id: `rt_${uuidv4()}`, token: refreshToken, userId, expiresAt });

    const responseData = {
      access_token: accessToken, refresh_token: refreshToken,
      user: { id: userId, name, email, role: 'admin', tenant_id: tenantId,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    };

    const response = NextResponse.json(responseData);
    response.cookies.set('auth_token', accessToken, {
      httpOnly: false, secure: false, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, path: '/',
    });
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'حدث خطأ في إنشاء الحساب' }, { status: 500 });
  }
}
