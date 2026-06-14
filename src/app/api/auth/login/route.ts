import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Simple hash function for demo - in production use bcrypt
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + Buffer.from(str).toString('base64').slice(0, 12);
}

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

    // Generate tokens - encode user ID in access token for simple lookup
    const accessToken = `at_${user.id}_${uuidv4()}`;
    const refreshToken = uuidv4() + '-refresh-' + Date.now().toString(36);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Clean up old refresh tokens for this user (keep last 5)
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
