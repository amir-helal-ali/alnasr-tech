import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, tenant_name } = body;

    if (!name || !email || !password || !tenant_name) {
      return NextResponse.json(
        { message: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    // Try Rust backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, tenant_name }),
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        const response = NextResponse.json(data);
        if (data.access_token) {
          response.cookies.set('auth_token', data.access_token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          });
        }
        return response;
      }

      const errorData = await backendRes.json().catch(() => ({ message: 'فشل التسجيل' }));
      return NextResponse.json(errorData, { status: backendRes.status });
    } catch (backendErr) {
      console.warn('Backend unreachable, using demo mode');
    }

    // Demo mode fallback
    const { db } = await import('@/lib/db');
    const { v4: uuidv4 } = await import('uuid');

    function simpleHash(str: string): string {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return 'h_' + Math.abs(hash).toString(36) + '_' + Buffer.from(str).toString('base64').slice(0, 12);
    }

    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { message: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      );
    }

    const tenant = await db.tenant.create({
      data: {
        name: tenant_name,
        subscriptionPlan: 'free',
        isActive: true,
      },
    });

    const user = await db.user.create({
      data: {
        name,
        email,
        password: simpleHash(password),
        role: 'admin',
        tenantId: tenant.id,
      },
    });

    const accessToken = `at_${user.id}_${uuidv4()}`;
    const refreshToken = uuidv4() + '-refresh-' + Date.now().toString(36);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const responseData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenantId,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
    };

    const response = NextResponse.json(responseData);
    response.cookies.set('auth_token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ في إنشاء الحساب' },
      { status: 500 }
    );
  }
}
