// Al-Nasr Tech ERP API Client
// Direct integration with Rust backend server

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3001';

// ---------------------------------------------------------------------------
// TypeScript Interfaces — Rust Backend Responses
// ---------------------------------------------------------------------------

// ---- Auth ----

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: 'admin' | 'accountant' | 'user' | 'viewer';
  created_at: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RefreshResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface ChangePasswordResponse {
  message: string;
}

// ---- Customers ----

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  notes: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  notes?: string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

// ---- Invoices ----

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'submitted'
  | 'accepted'
  | 'paid'
  | 'cancelled'
  | 'overdue';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: string; // decimal as string from Rust
  tax_rate: string;   // decimal as string from Rust
  tax_amount: string;
  total: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  notes: string | null;
  items: InvoiceItem[];
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate?: string;
}

export interface CreateInvoiceInput {
  customer_id: string;
  items: CreateInvoiceItemInput[];
  due_date?: string;
  notes?: string;
}

export interface UpdateInvoiceInput {
  customer_id?: string;
  items?: CreateInvoiceItemInput[];
  due_date?: string;
  notes?: string;
}

export interface UpdateInvoiceStatusInput {
  status: InvoiceStatus;
}

// ---- Payments ----

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'check' | 'other';

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  invoice?: Invoice;
  amount: string; // decimal as string from Rust
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  status: string;
  paid_at: string;
  created_at: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreatePaymentInput {
  invoice_id: string;
  amount: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

// ---- Users (Admin) ----

export interface User {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: 'admin' | 'accountant' | 'user' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  tenant_id: string;
  role?: 'admin' | 'accountant' | 'user' | 'viewer';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: 'admin' | 'accountant' | 'user' | 'viewer';
  is_active?: boolean;
}

// ---- Tenants (Admin) ----

export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  plan: TenantPlan;
  settings: string | null; // JSON string from Rust
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateTenantInput {
  name: string;
  plan?: TenantPlan;
  settings?: string; // JSON string
}

export interface UpdateTenantInput {
  name?: string;
  plan?: TenantPlan;
  settings?: string;
  is_active?: boolean;
}

// ---- Audit ----

export interface AuditLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  per_page: number;
}

// ---- Analytics ----

export interface DashboardStats {
  total_revenue: string;
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  total_customers: number;
  total_payments: number;
  average_invoice_value: string;
}

export interface RevenueEntry {
  month: string;
  revenue: string;
  invoice_count: number;
}

export interface TrendEntry {
  period: string;
  invoices: number;
  revenue: string;
  payments: string;
}

// ---- E-Invoicing ----

export interface EtaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface EtaSubmission {
  id: string;
  invoice_id: string;
  status: string;
  eta_response: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// ---- Health ----

export interface HealthResponse {
  status: string;
  database: string;
  pool_size: number;
  pool_idle: number;
  version: string;
}

// ---- Generic Message ----

export interface MessageResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private refreshingPromise: Promise<boolean> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('erp_token');
      this.refreshTokenValue = localStorage.getItem('erp_refresh_token');
    }
  }

  // ---- Token Management ----

  setTokens(token: string, refreshToken: string) {
    this.token = token;
    this.refreshTokenValue = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_token', token);
      localStorage.setItem('erp_refresh_token', refreshToken);
      // Also set a cookie so middleware / SSR can check auth
      document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshTokenValue = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_refresh_token');
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  // ---- Core Request ----

  private buildUrl(endpoint: string): string {
    return `${API_BASE_URL}${endpoint}`;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshTokenValue) return false;

    // Deduplicate concurrent refresh attempts
    if (this.refreshingPromise) return this.refreshingPromise;

    this.refreshingPromise = (async () => {
      try {
        const res = await fetch(this.buildUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshTokenValue }),
        });

        if (!res.ok) {
          this.clearTokens();
          return false;
        }

        const data: RefreshResponse = await res.json();
        this.setTokens(data.token, data.refresh_token);
        return true;
      } catch {
        this.clearTokens();
        return false;
      } finally {
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise;
  }

  private handleUnauthorized() {
    this.clearTokens();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:logout'));
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let res = await fetch(this.buildUrl(endpoint), { ...options, headers });

    // On 401, attempt a single token refresh then retry
    if (res.status === 401 && this.refreshTokenValue) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.token}`;
        res = await fetch(this.buildUrl(endpoint), { ...options, headers });
      } else {
        this.handleUnauthorized();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (res.status === 401) {
      this.handleUnauthorized();
      throw new Error('Unauthorized. Please log in again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json();
  }

  // ---- Auth ----

  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.token, data.refresh_token);
    return data;
  }

  async register(input: {
    email: string;
    password: string;
    name: string;
    tenant_id?: string;
  }): Promise<RegisterResponse> {
    const data = await this.request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setTokens(data.token, data.refresh_token);
    return data;
  }

  async refreshAuth(refresh_token: string): Promise<RefreshResponse> {
    const data = await this.request<RefreshResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    });
    this.setTokens(data.token, data.refresh_token);
    return data;
  }

  async getMe(): Promise<AuthUser> {
    return this.request<AuthUser>('/api/auth/me');
  }

  async changePassword(
    old_password: string,
    new_password: string,
  ): Promise<ChangePasswordResponse> {
    return this.request<ChangePasswordResponse>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ old_password, new_password }),
    });
  }

  async logout(): Promise<void> {
    this.clearTokens();
  }

  // ---- Customers ----

  async getCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<CustomerListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.search) query.set('search', params.search);
    return this.request<CustomerListResponse>(`/api/customers?${query}`);
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.request<Customer>(`/api/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    return this.request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(
    id: string,
    data: UpdateCustomerInput,
  ): Promise<Customer> {
    return this.request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string): Promise<MessageResponse> {
    return this.request<MessageResponse>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async exportCustomers(): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(this.buildUrl('/api/customers/export'), {
      headers,
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  // ---- Invoices ----

  async getInvoices(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    customer_id?: string;
  }): Promise<InvoiceListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.status) query.set('status', params.status);
    if (params?.customer_id) query.set('customer_id', params.customer_id);
    return this.request<InvoiceListResponse>(`/api/invoices?${query}`);
  }

  async getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/api/invoices/${id}`);
  }

  async createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
    return this.request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: UpdateInvoiceInput): Promise<Invoice> {
    return this.request<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
  ): Promise<Invoice> {
    return this.request<Invoice>(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteInvoice(id: string): Promise<MessageResponse> {
    return this.request<MessageResponse>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async exportInvoices(): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(this.buildUrl('/api/invoices/export'), {
      headers,
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  // ---- Payments ----

  async getPayments(params?: {
    page?: number;
    per_page?: number;
    invoice_id?: string;
  }): Promise<PaymentListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.invoice_id) query.set('invoice_id', params.invoice_id);
    return this.request<PaymentListResponse>(`/api/payments?${query}`);
  }

  async getPayment(id: string): Promise<Payment> {
    return this.request<Payment>(`/api/payments/${id}`);
  }

  async createPayment(data: CreatePaymentInput): Promise<Payment> {
    return this.request<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ---- Users (Admin) ----

  async getUsers(params?: {
    page?: number;
    per_page?: number;
    role?: string;
    tenant_id?: string;
  }): Promise<UserListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.role) query.set('role', params.role);
    if (params?.tenant_id) query.set('tenant_id', params.tenant_id);
    return this.request<UserListResponse>(`/api/users?${query}`);
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/api/users/${id}`);
  }

  async createUser(data: CreateUserInput): Promise<User> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string): Promise<MessageResponse> {
    return this.request<MessageResponse>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  // ---- Tenants (Admin) ----

  async getTenants(params?: {
    page?: number;
    per_page?: number;
    is_active?: boolean;
  }): Promise<TenantListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.is_active !== undefined)
      query.set('is_active', String(params.is_active));
    return this.request<TenantListResponse>(`/api/tenants?${query}`);
  }

  async getTenant(id: string): Promise<Tenant> {
    return this.request<Tenant>(`/api/tenants/${id}`);
  }

  async createTenant(data: CreateTenantInput): Promise<Tenant> {
    return this.request<Tenant>('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
    return this.request<Tenant>(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTenant(id: string): Promise<MessageResponse> {
    return this.request<MessageResponse>(`/api/tenants/${id}`, {
      method: 'DELETE',
    });
  }

  // ---- Audit ----

  async getAuditLogs(params?: {
    page?: number;
    per_page?: number;
    user_id?: string;
    entity_type?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<AuditLogListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.user_id) query.set('user_id', params.user_id);
    if (params?.entity_type) query.set('entity_type', params.entity_type);
    if (params?.action) query.set('action', params.action);
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    return this.request<AuditLogListResponse>(`/api/audit?${query}`);
  }

  async getAuditLog(id: string): Promise<AuditLog> {
    return this.request<AuditLog>(`/api/audit/${id}`);
  }

  // ---- Analytics ----

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/analytics/dashboard');
  }

  async getRevenue(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<RevenueEntry[]> {
    const query = new URLSearchParams();
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    return this.request<RevenueEntry[]>(
      `/api/analytics/revenue${query.toString() ? `?${query}` : ''}`,
    );
  }

  async getTrends(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<TrendEntry[]> {
    const query = new URLSearchParams();
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    return this.request<TrendEntry[]>(
      `/api/analytics/trends${query.toString() ? `?${query}` : ''}`,
    );
  }

  // ---- E-Invoicing ----

  async getEtaToken(): Promise<EtaTokenResponse> {
    return this.request<EtaTokenResponse>('/api/einvoicing/token');
  }

  async submitInvoice(invoice_id: string): Promise<EtaSubmission> {
    return this.request<EtaSubmission>('/api/einvoicing/submit', {
      method: 'POST',
      body: JSON.stringify({ invoice_id }),
    });
  }

  async getSubmissionStatus(id: string): Promise<EtaSubmission> {
    return this.request<EtaSubmission>(`/api/einvoicing/status/${id}`);
  }

  // ---- Health ----

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }
}

// Singleton export
export const api = new ApiClient();
