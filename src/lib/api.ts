// Al-Nasr Tech ERP API Client
// Connects to the Rust Axum backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiError {
  message: string;
  code?: string;
}

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(access: string, refresh: string) {
    this.token = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.token}`;
        res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:logout'));
        }
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string; refresh_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async register(name: string, email: string, password: string, tenant_name: string) {
    const data = await this.request<{ access_token: string; refresh_token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, tenant_name }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async getMe() {
    return this.request<User>('/api/auth/me');
  }

  async changePassword(current_password: string, new_password: string) {
    return this.request<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  async logout() {
    this.clearTokens();
  }

  // Customers
  async getCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    return this.request<PaginatedResponse<Customer>>(`/api/customers?${query}`);
  }

  async getCustomer(id: string) {
    return this.request<Customer>(`/api/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerInput) {
    return this.request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: Partial<CreateCustomerInput>) {
    return this.request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request<void>(`/api/customers/${id}`, { method: 'DELETE' });
  }

  // Invoices
  async getInvoices(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    return this.request<PaginatedResponse<Invoice>>(`/api/invoices?${query}`);
  }

  async getInvoice(id: string) {
    return this.request<Invoice>(`/api/invoices/${id}`);
  }

  async createInvoice(data: CreateInvoiceInput) {
    return this.request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: Partial<CreateInvoiceInput>) {
    return this.request<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request<void>(`/api/invoices/${id}`, { method: 'DELETE' });
  }

  // Payments
  async getPayments(params?: { page?: number; limit?: number; invoice_id?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.invoice_id) query.set('invoice_id', params.invoice_id);
    return this.request<PaginatedResponse<Payment>>(`/api/payments?${query}`);
  }

  async createPayment(data: CreatePaymentInput) {
    return this.request<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users
  async getUsers(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return this.request<PaginatedResponse<User>>(`/api/users?${query}`);
  }

  async createUser(data: CreateUserInput) {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Partial<CreateUserInput>) {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request<void>(`/api/users/${id}`, { method: 'DELETE' });
  }

  // Tenants
  async getTenants(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return this.request<PaginatedResponse<Tenant>>(`/api/tenants?${query}`);
  }

  async createTenant(data: CreateTenantInput) {
    return this.request<Tenant>('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTenant(id: string, data: Partial<CreateTenantInput>) {
    return this.request<Tenant>(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Audit
  async getAuditLogs(params?: { page?: number; limit?: number; action?: string; entity?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.action) query.set('action', params.action);
    if (params?.entity) query.set('entity', params.entity);
    return this.request<PaginatedResponse<AuditLog>>(`/api/audit?${query}`);
  }

  // Analytics
  async getDashboardStats() {
    return this.request<DashboardStats>('/api/analytics/dashboard');
  }

  async getRevenueByMonth(year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.request<RevenueData[]>(`/api/analytics/revenue${query}`);
  }

  async getTrends(months?: number) {
    const query = months ? `?months=${months}` : '';
    return this.request<TrendData[]>(`/api/analytics/trends${query}`);
  }

  // E-Invoicing
  async getEtaToken() {
    return this.request<{ token: string; expires_at: string }>('/api/einvoicing/token');
  }

  async submitInvoice(invoice_id: string) {
    return this.request<{ submission_id: string; status: string }>('/api/einvoicing/submit', {
      method: 'POST',
      body: JSON.stringify({ invoice_id }),
    });
  }

  async getSubmissionStatus(submission_id: string) {
    return this.request<{ status: string; eta_response?: string }>(`/api/einvoicing/status/${submission_id}`);
  }

  get isAuthenticated() {
    return !!this.token;
  }
}

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  status: 'draft' | 'issued' | 'submitted' | 'accepted' | 'paid' | 'cancelled';
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  notes?: string;
  line_items: InvoiceLineItem[];
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice?: Invoice;
  amount: string;
  method: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
  reference?: string;
  notes?: string;
  paid_at: string;
  tenant_id: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  name_ar?: string;
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  total_revenue: string;
  total_customers: number;
  total_invoices: number;
  pending_invoices: number;
  paid_invoices: number;
  overdue_amount: string;
  recent_invoices: Invoice[];
}

export interface RevenueData {
  month: string;
  revenue: string;
  count: number;
}

export interface TrendData {
  period: string;
  invoices: number;
  revenue: string;
  payments: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Input types
export interface CreateCustomerInput {
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
}

export interface CreateInvoiceInput {
  customer_id: string;
  issue_date: string;
  due_date: string;
  notes?: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: string;
    tax_rate: string;
  }[];
}

export interface CreatePaymentInput {
  invoice_id: string;
  amount: string;
  method: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
  reference?: string;
  notes?: string;
  paid_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
}

export interface CreateTenantInput {
  name: string;
  name_ar?: string;
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
}

// Singleton
export const api = new ApiClient();
