import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    // Try Rust backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        const response = NextResponse.json(data);
        // Set auth cookie for middleware
        if (data.access_token) {
          response.cookies.set('auth_token', data.access_token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
          });
        }
        return response;
      }

      // Backend returned error - forward it
      const errorData = await backendRes.json().catch(() => ({ message: 'فشل تسجيل الدخول' }));
      return NextResponse.json(errorData, { status: backendRes.status });
    } catch (backendErr) {
      // Backend unreachable - fall through to demo mode
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

    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || user.password !== simpleHash(password)) {
      return NextResponse.json(
        { message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

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

    // Clean up old refresh tokens
    const tokens = await db.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (tokens.length > 5) {
      const tokensToDelete = tokens.slice(5).map((t) => t.id);
      await db.refreshToken.deleteMany({
        where: { id: { in: tokensToDelete } },
      });
    }

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
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
