// Lightweight SQLite database access using better-sqlite3
// Avoids heavy Prisma client loading that causes OOM in constrained environments
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'db', 'custom.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: false });
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// Simple hash function - matches the one used in seed script
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + Buffer.from(str).toString('base64').slice(0, 12);
}

// Query helpers
export const db = {
  // Auth
  findUserByEmail(email: string) {
    return getDb().prepare('SELECT * FROM User WHERE email = ?').get(email) as any;
  },
  findUserById(id: string) {
    return getDb().prepare('SELECT * FROM User WHERE id = ?').get(id) as any;
  },
  findTenantById(id: string) {
    return getDb().prepare('SELECT * FROM Tenant WHERE id = ?').get(id) as any;
  },
  createUser(data: { id: string; name: string; email: string; password: string; role: string; tenantId: string }) {
    return getDb().prepare(
      'INSERT INTO User (id, name, email, password, role, tenantId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime(), datetime())'
    ).run(data.id, data.name, data.email, data.password, data.role, data.tenantId);
  },
  createTenant(data: { id: string; name: string; subscriptionPlan: string; isActive: number }) {
    return getDb().prepare(
      'INSERT INTO Tenant (id, name, subscriptionPlan, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime(), datetime())'
    ).run(data.id, data.name, data.subscriptionPlan, data.isActive);
  },
  createRefreshToken(data: { id: string; token: string; userId: string; expiresAt: string }) {
    return getDb().prepare(
      'INSERT INTO RefreshToken (id, token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?, datetime())'
    ).run(data.id, data.token, data.userId, data.expiresAt);
  },
  deleteOldRefreshTokens(userId: string, keepCount: number) {
    const tokens = getDb().prepare(
      'SELECT id FROM RefreshToken WHERE userId = ? ORDER BY createdAt DESC'
    ).all(userId) as any[];
    if (tokens.length > keepCount) {
      const toDelete = tokens.slice(keepCount).map((t: any) => t.id);
      const placeholders = toDelete.map(() => '?').join(',');
      getDb().prepare(`DELETE FROM RefreshToken WHERE id IN (${placeholders})`).run(...toDelete);
    }
  },

  // Customers
  getCustomers(page: number, limit: number, search: string) {
    const offset = (page - 1) * limit;
    let where = '';
    const params: any[] = [];
    if (search) {
      where = 'WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const data = getDb().prepare(
      `SELECT * FROM Customer ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as any[];
    const total = (getDb().prepare(`SELECT COUNT(*) as count FROM Customer ${where}`).get(...params) as any).count;
    return { data, total };
  },
  createCustomer(data: { id: string; name: string; nameAr?: string; email?: string; phone?: string; address?: string; taxNumber?: string; tenantId: string }) {
    return getDb().prepare(
      'INSERT INTO Customer (id, name, nameAr, email, phone, address, taxNumber, isActive, tenantId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime(), datetime())'
    ).run(data.id, data.name, data.nameAr || null, data.email || null, data.phone || null, data.address || null, data.taxNumber || null, data.tenantId);
  },

  // Invoices
  getInvoices(page: number, limit: number, status: string) {
    const offset = (page - 1) * limit;
    let where = '';
    const params: any[] = [];
    if (status && status !== 'all') {
      where = 'WHERE i.status = ?';
      params.push(status);
    }
    const data = getDb().prepare(
      `SELECT i.*, c.name as customerName, c.email as customerEmail, c.phone as customerPhone,
              c.address as customerAddress, c.taxNumber as customerTaxNumber
       FROM Invoice i LEFT JOIN Customer c ON i.customerId = c.id ${where}
       ORDER BY i.createdAt DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as any[];
    const total = (getDb().prepare(`SELECT COUNT(*) as count FROM Invoice i ${where}`).get(...params) as any).count;
    // Get line items for each invoice
    for (const inv of data) {
      inv.lineItems = getDb().prepare(
        'SELECT * FROM InvoiceLineItem WHERE invoiceId = ? ORDER BY id'
      ).all(inv.id);
      inv.customer = inv.customerName ? {
        id: inv.customerId, name: inv.customerName, email: inv.customerEmail,
        phone: inv.customerPhone, address: inv.customerAddress, taxNumber: inv.customerTaxNumber,
      } : null;
    }
    return { data, total };
  },

  // Payments
  getPayments(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const data = getDb().prepare(
      `SELECT p.*, i.invoiceNumber, c.name as customerName
       FROM Payment p LEFT JOIN Invoice i ON p.invoiceId = i.id LEFT JOIN Customer c ON i.customerId = c.id
       ORDER BY p.paidAt DESC LIMIT ? OFFSET ?`
    ).all(limit, offset) as any[];
    const total = (getDb().prepare('SELECT COUNT(*) as count FROM Payment').get() as any).count;
    return { data, total };
  },
  createPayment(data: { id: string; invoiceId: string; amount: number; method: string; reference?: string; notes?: string; tenantId: string }) {
    return getDb().prepare(
      'INSERT INTO Payment (id, invoiceId, amount, method, reference, notes, paidAt, tenantId, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(), ?, datetime())'
    ).run(data.id, data.invoiceId, data.amount, data.method, data.reference || null, data.notes || null, data.tenantId);
  },

  // Users
  getUsers(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const data = getDb().prepare('SELECT id, name, email, role, tenantId, createdAt, updatedAt FROM User ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    const total = (getDb().prepare('SELECT COUNT(*) as count FROM User').get() as any).count;
    return { data, total };
  },

  // Tenants
  getTenants(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const data = getDb().prepare('SELECT * FROM Tenant ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    const total = (getDb().prepare('SELECT COUNT(*) as count FROM Tenant').get() as any).count;
    return { data, total };
  },

  // Audit
  getAuditLogs(page: number, limit: number, action?: string, entity?: string) {
    const offset = (page - 1) * limit;
    let where = '';
    const params: any[] = [];
    if (action) { where += 'WHERE action = ?'; params.push(action); }
    if (entity) { where += (where ? ' AND' : 'WHERE') + ' entityType = ?'; params.push(entity); }
    const data = getDb().prepare(
      `SELECT * FROM AuditLog ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as any[];
    const total = (getDb().prepare(`SELECT COUNT(*) as count FROM AuditLog ${where}`).get(...params) as any).count;
    return { data, total };
  },

  // Dashboard stats
  getDashboardStats() {
    const totalRevenue = (getDb().prepare('SELECT COALESCE(SUM(total), 0) as sum FROM Invoice').get() as any).sum;
    const totalCustomers = (getDb().prepare('SELECT COUNT(*) as count FROM Customer').get() as any).count;
    const totalInvoices = (getDb().prepare('SELECT COUNT(*) as count FROM Invoice').get() as any).count;
    const pendingInvoices = (getDb().prepare("SELECT COUNT(*) as count FROM Invoice WHERE status IN ('draft', 'issued')").get() as any).count;
    const paidInvoices = (getDb().prepare("SELECT COUNT(*) as count FROM Invoice WHERE status = 'paid'").get() as any).count;
    const recentInvoices = getDb().prepare(
      `SELECT i.*, c.name as customerName, c.email as customerEmail, c.phone as customerPhone,
              c.address as customerAddress, c.taxNumber as customerTaxNumber
       FROM Invoice i LEFT JOIN Customer c ON i.customerId = c.id
       ORDER BY i.createdAt DESC LIMIT 5`
    ).all() as any[];
    return { totalRevenue, totalCustomers, totalInvoices, pendingInvoices, paidInvoices, recentInvoices };
  },
};
