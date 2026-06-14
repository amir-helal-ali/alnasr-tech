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

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      );
    }

    // Create tenant first
    const tenant = await db.tenant.create({
      data: {
        name: tenant_name,
        subscriptionPlan: 'free',
        isActive: true,
      },
    });

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: simpleHash(password),
        role: 'admin',
        tenantId: tenant.id,
      },
    });

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
    console.error('Register error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ في إنشاء الحساب' },
      { status: 500 }
    );
  }
}
