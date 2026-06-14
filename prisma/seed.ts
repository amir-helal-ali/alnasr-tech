import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple hash for demo (matches the API route)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + Buffer.from(str).toString('base64').slice(0, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant_alnasr_001' },
    update: {},
    create: {
      id: 'tenant_alnasr_001',
      name: 'Al-Nasr Tech',
      nameAr: 'النصر تك',
      subscriptionPlan: 'enterprise',
      isActive: true,
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // 2. Create Admin User
  const adminPassword = simpleHash('Admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@alnasr.tech' },
    update: {},
    create: {
      id: 'user_admin_001',
      email: 'admin@alnasr.tech',
      name: 'أمير هلال',
      password: adminPassword,
      role: 'admin',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 3. Create more users
  const managerPassword = simpleHash('Manager@123');
  const manager = await prisma.user.upsert({
    where: { email: 'manager@alnasr.tech' },
    update: {},
    create: {
      id: 'user_manager_001',
      email: 'manager@alnasr.tech',
      name: 'أحمد محمد',
      password: managerPassword,
      role: 'manager',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Manager user created:', manager.email);

  // 4. Create Customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust_001' },
      update: {},
      create: {
        id: 'cust_001',
        name: 'شركة النيل للتقنية',
        nameAr: 'شركة النيل للتقنية',
        email: 'info@niletech.eg',
        phone: '+20 2 2345 6789',
        address: 'القاهرة، مصر الجديدة، شارع النيل',
        taxNumber: '300-123-4567',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_002' },
      update: {},
      create: {
        id: 'cust_002',
        name: 'مؤسسة الأهرام',
        nameAr: 'مؤسسة الأهرام',
        email: 'sales@ahram.eg',
        phone: '+20 2 2789 0123',
        address: 'الجيزة، الهرم، شارع الأهرام',
        taxNumber: '300-234-5678',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_003' },
      update: {},
      create: {
        id: 'cust_003',
        name: 'شركة القاهرة الرقمية',
        nameAr: 'شركة القاهرة الرقمية',
        email: 'contact@cairodigital.eg',
        phone: '+20 2 2456 7890',
        address: 'القاهرة، المعادي، شارع 9',
        taxNumber: '300-345-6789',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_004' },
      update: {},
      create: {
        id: 'cust_004',
        name: 'مجموعة الإسكندرية',
        nameAr: 'مجموعة الإسكندرية',
        email: 'info@alexgroup.eg',
        phone: '+20 3 5123 4567',
        address: 'الإسكندرية، سموحة، شارع 14 مايو',
        taxNumber: '300-456-7890',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_005' },
      update: {},
      create: {
        id: 'cust_005',
        name: 'شركة الدلتا للخدمات',
        nameAr: 'شركة الدلتا للخدمات',
        email: 'info@deltaservices.eg',
        phone: '+20 50 234 5678',
        address: 'المنصورة، شارع الجلاء',
        taxNumber: '300-567-8901',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_006' },
      update: {},
      create: {
        id: 'cust_006',
        name: 'شركة الصحراء للإنشاءات',
        nameAr: 'شركة الصحراء للإنشاءات',
        email: 'info@saharaconstruct.eg',
        phone: '+20 2 3456 7890',
        address: 'القاهرة، مدينة نصر، شارع عباس العقاد',
        taxNumber: '300-678-9012',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_007' },
      update: {},
      create: {
        id: 'cust_007',
        name: 'مؤسسة النور للتجارة',
        nameAr: 'مؤسسة النور للتجارة',
        email: 'info@alnourtrade.eg',
        phone: '+20 2 4567 8901',
        address: 'القاهرة، وسط البلد، شارع طلعت حرب',
        taxNumber: '300-789-0123',
        isActive: true,
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust_008' },
      update: {},
      create: {
        id: 'cust_008',
        name: 'شركة الوادي للبرمجيات',
        nameAr: 'شركة الوادي للبرمجيات',
        email: 'info@wadisoft.eg',
        phone: '+20 88 234 5678',
        address: 'أسيوط، شارع صلاح سالم',
        taxNumber: '300-890-1234',
        isActive: false,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log('✅ Customers created:', customers.length);

  // 5. Create Invoices with line items
  const invoiceData = [
    { id: 'inv_001', number: 'INV-2024-001', customerId: 'cust_001', status: 'paid', subtotal: 50000, tax: 7000, total: 57000, items: [
      { desc: 'خدمات تطوير الموقع الإلكتروني', qty: 1, price: 30000, taxRate: 14 },
      { desc: 'صيانة شهرية - 6 أشهر', qty: 6, price: 3333.33, taxRate: 14 },
    ]},
    { id: 'inv_002', number: 'INV-2024-002', customerId: 'cust_002', status: 'paid', subtotal: 75000, tax: 10500, total: 85500, items: [
      { desc: 'نظام إدارة المحتوى', qty: 1, price: 50000, taxRate: 14 },
      { desc: 'تدريب الفريق', qty: 5, price: 5000, taxRate: 14 },
    ]},
    { id: 'inv_003', number: 'INV-2024-003', customerId: 'cust_003', status: 'issued', subtotal: 35000, tax: 4900, total: 39900, items: [
      { desc: 'تصميم واجهة المستخدم', qty: 1, price: 20000, taxRate: 14 },
      { desc: 'تصميم شعار', qty: 3, price: 5000, taxRate: 14 },
    ]},
    { id: 'inv_004', number: 'INV-2024-004', customerId: 'cust_004', status: 'issued', subtotal: 120000, tax: 16800, total: 136800, items: [
      { desc: 'نظام ERP متكامل', qty: 1, price: 100000, taxRate: 14 },
      { desc: 'نشر وتكوين', qty: 1, price: 20000, taxRate: 14 },
    ]},
    { id: 'inv_005', number: 'INV-2024-005', customerId: 'cust_001', status: 'draft', subtotal: 25000, tax: 3500, total: 28500, items: [
      { desc: 'تطبيق جوال - المرحلة الأولى', qty: 1, price: 25000, taxRate: 14 },
    ]},
    { id: 'inv_006', number: 'INV-2024-006', customerId: 'cust_005', status: 'paid', subtotal: 45000, tax: 6300, total: 51300, items: [
      { desc: 'استشارات تقنية', qty: 15, price: 3000, taxRate: 14 },
    ]},
    { id: 'inv_007', number: 'INV-2024-007', customerId: 'cust_006', status: 'cancelled', subtotal: 18000, tax: 2520, total: 20520, items: [
      { desc: 'خدمات استضافة', qty: 12, price: 1500, taxRate: 14 },
    ]},
    { id: 'inv_008', number: 'INV-2024-008', customerId: 'cust_007', status: 'issued', subtotal: 60000, tax: 8400, total: 68400, items: [
      { desc: 'نظام نقاط البيع', qty: 1, price: 40000, taxRate: 14 },
      { desc: 'أجهزة وتركيب', qty: 4, price: 5000, taxRate: 14 },
    ]},
    { id: 'inv_009', number: 'INV-2024-009', customerId: 'cust_002', status: 'draft', subtotal: 90000, tax: 12600, total: 102600, items: [
      { desc: 'منصة تجارة إلكترونية', qty: 1, price: 70000, taxRate: 14 },
      { desc: 'ربط بوابات الدفع', qty: 2, price: 10000, taxRate: 14 },
    ]},
    { id: 'inv_010', number: 'INV-2024-010', customerId: 'cust_003', status: 'paid', subtotal: 22000, tax: 3080, total: 25080, items: [
      { desc: 'تحسين محركات البحث SEO', qty: 1, price: 12000, taxRate: 14 },
      { desc: 'إدارة الحملات الإعلانية', qty: 2, price: 5000, taxRate: 14 },
    ]},
  ];

  for (const inv of invoiceData) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        invoiceNumber: inv.number,
        customerId: inv.customerId,
        status: inv.status,
        subtotal: inv.subtotal,
        taxAmount: inv.tax,
        total: inv.total,
        issueDate: new Date('2024-06-01'),
        dueDate: new Date('2024-07-01'),
        tenantId: tenant.id,
        lineItems: {
          create: inv.items.map((item, idx) => ({
            id: `${inv.id}_item_${idx + 1}`,
            description: item.desc,
            quantity: item.qty,
            unitPrice: item.price,
            taxRate: item.taxRate,
            taxAmount: item.price * item.qty * item.taxRate / 100,
            total: item.price * item.qty * (1 + item.taxRate / 100),
          })),
        },
      },
    });
  }
  console.log('✅ Invoices created:', invoiceData.length);

  // 6. Create Payments
  const paymentData = [
    { id: 'pay_001', invoiceId: 'inv_001', amount: 57000, method: 'bank_transfer', ref: 'TRX-2024-001' },
    { id: 'pay_002', invoiceId: 'inv_002', amount: 85500, method: 'cash', ref: null },
    { id: 'pay_003', invoiceId: 'inv_006', amount: 51300, method: 'credit_card', ref: 'CC-2024-003' },
    { id: 'pay_004', invoiceId: 'inv_010', amount: 25080, method: 'check', ref: 'CHK-2024-004' },
  ];

  for (const pay of paymentData) {
    await prisma.payment.upsert({
      where: { id: pay.id },
      update: {},
      create: {
        id: pay.id,
        invoiceId: pay.invoiceId,
        amount: pay.amount,
        method: pay.method,
        reference: pay.ref,
        paidAt: new Date('2024-06-05'),
        tenantId: tenant.id,
      },
    });
  }
  console.log('✅ Payments created:', paymentData.length);

  // 7. Create Audit Logs
  const auditData = [
    { action: 'login', entityType: 'user', entityId: 'user_admin_001', details: 'تسجيل دخول ناجح', ip: '192.168.1.1' },
    { action: 'create', entityType: 'invoice', entityId: 'inv_001', details: 'إنشاء فاتورة INV-2024-001', ip: '192.168.1.1' },
    { action: 'update', entityType: 'customer', entityId: 'cust_001', details: 'تحديث بيانات العميل', ip: '192.168.1.2' },
    { action: 'payment', entityType: 'invoice', entityId: 'inv_001', details: 'تسجيل دفعة للفاتورة INV-2024-001', ip: '192.168.1.1' },
    { action: 'create', entityType: 'invoice', entityId: 'inv_005', details: 'إنشاء فاتورة INV-2024-005', ip: '192.168.1.3' },
    { action: 'cancel', entityType: 'invoice', entityId: 'inv_007', details: 'إلغاء الفاتورة INV-2024-007', ip: '192.168.1.1' },
    { action: 'login', entityType: 'user', entityId: 'user_manager_001', details: 'تسجيل دخول ناجح', ip: '192.168.1.5' },
    { action: 'create', entityType: 'customer', entityId: 'cust_006', details: 'إضافة عميل جديد', ip: '192.168.1.5' },
  ];

  for (const log of auditData) {
    await prisma.auditLog.create({
      data: {
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ip,
        userId: log.entityId === 'user_manager_001' ? 'user_manager_001' : 'user_admin_001',
        tenantId: tenant.id,
      },
    });
  }
  console.log('✅ Audit logs created:', auditData.length);

  console.log('\n🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Admin Login:');
  console.log('   Email:    admin@alnasr.tech');
  console.log('   Password: Admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
