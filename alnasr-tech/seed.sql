-- ═══════════════════════════════════════════════════════════════════════
-- Al-Nasr Tech ERP — Seed Data
-- ═══════════════════════════════════════════════════════════════════════
-- Run AFTER the initial schema migration:
--   docker exec -i alnasr-db psql -U alnasr -d alnasr_tech < alnasr-tech/seed.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Set RLS context (table owner bypasses RLS, but set for safety)
SET app.current_tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
SET app.current_user_id   = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

-- ── 0. Clean existing seed data (reverse dependency order) ──────────────
DELETE FROM audit_logs          WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM payments            WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM invoice_line_items  WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
DELETE FROM invoices            WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM customers           WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM users               WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM tenants             WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- ── 1. Tenant ──────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, plan, settings, is_active, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Al-Nasr Tech',
    'enterprise',
    '{"currency": "EGP", "locale": "ar", "timezone": "Africa/Cairo", "tax_rate": 14}'::jsonb,
    true,
    NOW(), NOW()
);

-- ── 2. Admin User ──────────────────────────────────────────────────────
-- Password: Admin@123  (Argon2 hash — pre-computed)
INSERT INTO users (id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'admin@alnasr.tech',
    '$argon2id$v=19$m=19456,t=2,p=1$YWKwPVi5VbN3r8v0FxJfPQ$KqzFZwV+0gE31vZMkDxvXUOR1wRZGCqF5Fhvp+PYVHU',
    'أمير هلال',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    true,
    NOW(), NOW()
);

-- ── 3. Accountant User ────────────────────────────────────────────────
-- Password: Accountant@123
INSERT INTO users (id, email, password_hash, name, tenant_id, role, is_active, created_at, updated_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'accountant@alnasr.tech',
    '$argon2id$v=19$m=19456,t=2,p=1$YWKwPVi5VbN3r8v0FxJfPQ$KqzFZwV+0gE31vZMkDxvXUOR1wRZGCqF5Fhvp+PYVHU',
    'أحمد محمد',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'accountant',
    true,
    NOW(), NOW()
);

-- ── 4. Customers ──────────────────────────────────────────────────────
INSERT INTO customers (id, tenant_id, name, email, phone, address, city, country, tax_id, notes, is_active, created_at, updated_at) VALUES
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'شركة النيل للتقنية', 'info@niletech.eg', '+20 2 2345 6789', 'القاهرة، مصر الجديدة، شارع النيل', 'القاهرة', 'EG', '300-123-4567', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'مؤسسة الأهرام', 'sales@ahram.eg', '+20 2 2789 0123', 'الجيزة، الهرم، شارع الأهرام', 'الجيزة', 'EG', '300-234-5678', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'شركة القاهرة الرقمية', 'contact@cairodigital.eg', '+20 2 2456 7890', 'القاهرة، المعادي، شارع 9', 'القاهرة', 'EG', '300-345-6789', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'مجموعة الإسكندرية', 'info@alexgroup.eg', '+20 3 5123 4567', 'الإسكندرية، سموحة، شارع 14 مايو', 'الإسكندرية', 'EG', '300-456-7890', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'شركة الدلتا للخدمات', 'info@deltaservices.eg', '+20 50 234 5678', 'المنصورة، شارع الجلاء', 'المنصورة', 'EG', '300-567-8901', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'شركة الصحراء للإنشاءات', 'info@saharaconstruct.eg', '+20 2 3456 7890', 'القاهرة، مدينة نصر، شارع عباس العقاد', 'القاهرة', 'EG', '300-678-9012', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'مؤسسة النور للتجارة', 'info@alnourtrade.eg', '+20 2 4567 8901', 'القاهرة، وسط البلد، شارع طلعت حرب', 'القاهرة', 'EG', '300-789-0123', NULL, true, NOW(), NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'شركة الوادي للبرمجيات', 'info@wadisoft.eg', '+20 88 234 5678', 'أسيوط، شارع صلاح سالم', 'أسيوط', 'EG', '300-890-1234', 'عميل غير نشط', false, NOW(), NOW());

-- ── 5. Invoices ───────────────────────────────────────────────────────
-- ALL tenant_id values use the SAME tenant: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
INSERT INTO invoices (id, tenant_id, invoice_number, customer_id, status, subtotal, tax_total, total, due_date, notes, issued_at, paid_at, created_at, updated_at) VALUES
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-001', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'paid',      50000.00, 7000.00,  57000.00,  '2024-07-01T00:00:00Z', NULL, '2024-06-01T00:00:00Z', '2024-06-05T00:00:00Z', NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-002', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'paid',      75000.00, 10500.00, 85500.00,  '2024-07-01T00:00:00Z', NULL, '2024-06-01T00:00:00Z', '2024-06-05T00:00:00Z', NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-003', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'issued',    35000.00, 4900.00,  39900.00,  '2024-07-15T00:00:00Z', NULL, '2024-06-10T00:00:00Z', NULL, NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-004', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'issued',    120000.00, 16800.00, 136800.00, '2024-07-20T00:00:00Z', NULL, '2024-06-12T00:00:00Z', NULL, NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-005', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'draft',     25000.00, 3500.00,  28500.00,  '2024-08-01T00:00:00Z', NULL, '2024-06-15T00:00:00Z', NULL, NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-006', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'paid',      45000.00, 6300.00,  51300.00,  '2024-07-01T00:00:00Z', NULL, '2024-06-01T00:00:00Z', '2024-06-10T00:00:00Z', NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-007', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'cancelled', 18000.00, 2520.00,  20520.00,  '2024-07-01T00:00:00Z', NULL, '2024-06-05T00:00:00Z', NULL, NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-008', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'issued',    60000.00, 8400.00,  68400.00,  '2024-07-25T00:00:00Z', NULL, '2024-06-10T00:00:00Z', NULL, NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a09', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-009', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'draft',     90000.00, 12600.00, 102600.00, '2024-08-15T00:00:00Z', NULL, '2024-06-18T00:00:00Z', NULL, NOW(), NOW()),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'INV-2024-010', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'paid',      22000.00, 3080.00,  25080.00,  '2024-07-01T00:00:00Z', NULL, '2024-06-01T00:00:00Z', '2024-06-08T00:00:00Z', NOW(), NOW());

-- ── 6. Invoice Line Items ─────────────────────────────────────────────
INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total) VALUES
-- INV-2024-001
('e1eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'خدمات تطوير الموقع الإلكتروني', 1.000, 30000.00, 14.00, 30000.00, 4200.00, 34200.00),
('e1eebc99-0002-4ef8-bb6d-6bb9bd380a01', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'صيانة شهرية - 6 أشهر', 6.000, 3333.33, 14.00, 19999.98, 2800.00, 22799.98),
-- INV-2024-002
('e1eebc99-0003-4ef8-bb6d-6bb9bd380a02', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'نظام إدارة المحتوى', 1.000, 50000.00, 14.00, 50000.00, 7000.00, 57000.00),
('e1eebc99-0004-4ef8-bb6d-6bb9bd380a02', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'تدريب الفريق', 5.000, 5000.00, 14.00, 25000.00, 3500.00, 28500.00),
-- INV-2024-003
('e1eebc99-0005-4ef8-bb6d-6bb9bd380a03', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'تصميم واجهة المستخدم', 1.000, 20000.00, 14.00, 20000.00, 2800.00, 22800.00),
('e1eebc99-0006-4ef8-bb6d-6bb9bd380a03', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'تصميم شعار', 3.000, 5000.00, 14.00, 15000.00, 2100.00, 17100.00),
-- INV-2024-004
('e1eebc99-0007-4ef8-bb6d-6bb9bd380a04', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'نظام ERP متكامل', 1.000, 100000.00, 14.00, 100000.00, 14000.00, 114000.00),
('e1eebc99-0008-4ef8-bb6d-6bb9bd380a04', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'نشر وتكوين', 1.000, 20000.00, 14.00, 20000.00, 2800.00, 22800.00),
-- INV-2024-005
('e1eebc99-0009-4ef8-bb6d-6bb9bd380a05', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'تطبيق جوال - المرحلة الأولى', 1.000, 25000.00, 14.00, 25000.00, 3500.00, 28500.00),
-- INV-2024-006
('e1eebc99-0010-4ef8-bb6d-6bb9bd380a06', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'استشارات تقنية', 15.000, 3000.00, 14.00, 45000.00, 6300.00, 51300.00),
-- INV-2024-007
('e1eebc99-0011-4ef8-bb6d-6bb9bd380a07', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'خدمات استضافة', 12.000, 1500.00, 14.00, 18000.00, 2520.00, 20520.00),
-- INV-2024-008
('e1eebc99-0012-4ef8-bb6d-6bb9bd380a08', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'نظام نقاط البيع', 1.000, 40000.00, 14.00, 40000.00, 5600.00, 45600.00),
('e1eebc99-0013-4ef8-bb6d-6bb9bd380a08', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'أجهزة وتركيب', 4.000, 5000.00, 14.00, 20000.00, 2800.00, 22800.00),
-- INV-2024-009
('e1eebc99-0014-4ef8-bb6d-6bb9bd380a09', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a09', 'منصة تجارة إلكترونية', 1.000, 70000.00, 14.00, 70000.00, 9800.00, 79800.00),
('e1eebc99-0015-4ef8-bb6d-6bb9bd380a09', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a09', 'ربط بوابات الدفع', 2.000, 10000.00, 14.00, 20000.00, 2800.00, 22800.00),
-- INV-2024-010
('e1eebc99-0016-4ef8-bb6d-6bb9bd380a10', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'تحسين محركات البحث SEO', 1.000, 12000.00, 14.00, 12000.00, 1680.00, 13680.00),
('e1eebc99-0017-4ef8-bb6d-6bb9bd380a10', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'إدارة الحملات الإعلانية', 2.000, 5000.00, 14.00, 10000.00, 1400.00, 11400.00);

-- ── 7. Payments ───────────────────────────────────────────────────────
INSERT INTO payments (id, tenant_id, invoice_id, amount, method, reference, notes, status, paid_at, created_at) VALUES
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 57000.00, 'bank_transfer', 'TRX-2024-001', NULL, 'completed', '2024-06-05T00:00:00Z', NOW()),
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 85500.00, 'cash',          NULL,             NULL, 'completed', '2024-06-05T00:00:00Z', NOW()),
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 51300.00, 'credit_card',   'CC-2024-003',   NULL, 'completed', '2024-06-10T00:00:00Z', NOW()),
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 25080.00, 'check',         'CHK-2024-004',  NULL, 'completed', '2024-06-08T00:00:00Z', NOW());

-- ── 8. Audit Logs ────────────────────────────────────────────────────
INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'login',   'user',     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'تسجيل دخول ناجح', '192.168.1.1', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'create',  'invoice',  'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'إنشاء فاتورة INV-2024-001', '192.168.1.1', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'update',  'customer', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'تحديث بيانات العميل', '192.168.1.2', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'payment', 'invoice',  'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'تسجيل دفعة للفاتورة INV-2024-001', '192.168.1.1', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'create',  'invoice',  'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'إنشاء فاتورة INV-2024-005', '192.168.1.3', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'cancel',  'invoice',  'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'إلغاء الفاتورة INV-2024-007', '192.168.1.1', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'login',   'user',     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'تسجيل دخول ناجح', '192.168.1.5', NOW()),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'create',  'customer', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'إضافة عميل جديد', '192.168.1.5', NOW());

-- ── Done ──────────────────────────────────────────────────────────────
-- Log in with:
--   Email:    admin@alnasr.tech
--   Password: Admin@123
