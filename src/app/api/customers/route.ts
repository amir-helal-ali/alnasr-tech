import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-lite';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const { data, total } = db.getCustomers(page, limit, search);
    return NextResponse.json({
      data: data.map(c => ({
        id: c.id, name: c.name, name_ar: c.nameAr, email: c.email, phone: c.phone,
        address: c.address, tax_number: c.taxNumber, is_active: !!c.isActive,
        tenant_id: c.tenantId, created_at: c.createdAt, updated_at: c.updatedAt,
      })),
      total, page, limit, total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ message: 'فشل في جلب العملاء' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ message: 'اسم العميل مطلوب' }, { status: 400 });
    const tenant = db.getTenants(1, 1).data[0];
    if (!tenant) return NextResponse.json({ message: 'لا توجد مؤسسة' }, { status: 400 });
    db.createCustomer({ id: `cust_${uuidv4()}`, name: body.name, nameAr: body.name_ar, email: body.email, phone: body.phone, address: body.address, taxNumber: body.tax_number, tenantId: tenant.id });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ message: 'فشل في إنشاء العميل' }, { status: 500 });
  }
}
