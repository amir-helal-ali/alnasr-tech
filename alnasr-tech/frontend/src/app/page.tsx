'use client';

import { useQuery } from '@tanstack/react-query';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { api, type DashboardStats, type RevenueEntry, type TrendEntry } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Invoice status display map
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'مدفوعة', variant: 'default' },
  issued: { label: 'صادرة', variant: 'secondary' },
  draft: { label: 'مسودة', variant: 'outline' },
  submitted: { label: 'مُقدمة', variant: 'secondary' },
  accepted: { label: 'مقبولة', variant: 'default' },
  cancelled: { label: 'ملغاة', variant: 'destructive' },
  overdue: { label: 'متأخرة', variant: 'destructive' },
};

// Format monetary string from backend (e.g. "1000.00") to display
function formatMoney(value: string, lang: 'ar' | 'en'): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return lang === 'ar'
    ? `${num.toLocaleString('ar-EG')} ج.م`
    : `EGP ${num.toLocaleString('en-US')}`;
}

function formatNumber(value: number, lang: 'ar' | 'en'): string {
  return lang === 'ar' ? value.toLocaleString('ar-EG') : value.toLocaleString('en-US');
}

// Loading skeleton for stat cards
function StatSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 w-full">
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
            <div className="h-8 bg-muted rounded animate-pulse w-32" />
            <div className="h-3 bg-muted rounded animate-pulse w-20" />
          </div>
          <div className="bg-muted p-3 rounded-xl animate-pulse">
            <div className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="p-6 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive font-medium">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 me-1" />
          إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  // ---- React Query hooks ----

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  });

  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useQuery<RevenueEntry[]>({
    queryKey: ['revenue'],
    queryFn: () => api.getRevenue(),
  });

  const {
    data: trendsData,
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useQuery<TrendEntry[]>({
    queryKey: ['trends'],
    queryFn: () => api.getTrends(),
  });

  // ---- Build stat cards from real data ----

  const statCards = stats
    ? [
        {
          title: t.totalRevenue,
          value: formatMoney(stats.total_revenue, language),
          icon: DollarSign,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        },
        {
          title: t.totalInvoices,
          value: formatNumber(stats.total_invoices, language),
          icon: FileText,
          color: 'text-violet-600',
          bg: 'bg-violet-50',
        },
        {
          title: t.paidInvoices,
          value: formatNumber(stats.paid_invoices, language),
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
        },
        {
          title: t.pendingInvoices,
          value: formatNumber(stats.pending_invoices, language),
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        },
        {
          title: t.overdueAmount,
          value: formatNumber(stats.overdue_invoices, language),
          icon: AlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
        },
        {
          title: t.totalCustomers,
          value: formatNumber(stats.total_customers, language),
          icon: Users,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        },
      ]
    : [];

  // Build invoice status pie data from stats
  const invoiceStatusData = stats
    ? [
        { name: language === 'ar' ? 'مدفوعة' : 'Paid', value: stats.paid_invoices, color: '#22c55e' },
        { name: language === 'ar' ? 'معلقة' : 'Pending', value: stats.pending_invoices, color: '#f59e0b' },
        { name: language === 'ar' ? 'متأخرة' : 'Overdue', value: stats.overdue_invoices, color: '#ef4444' },
        {
          name: language === 'ar' ? 'أخرى' : 'Other',
          value: Math.max(0, stats.total_invoices - stats.paid_invoices - stats.pending_invoices - stats.overdue_invoices),
          color: '#8b5cf6',
        },
      ].filter((d) => d.value > 0)
    : [];

  const totalForPie = invoiceStatusData.reduce((sum, d) => sum + d.value, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.dashboard}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t.appSubtitle}</p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <TrendingUp className="h-4 w-4 ml-1 text-emerald-500" />
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, idx) => <StatSkeleton key={idx} />)
          ) : statsError ? (
            <div className="col-span-full">
              <ErrorState
                message={language === 'ar' ? 'فشل تحميل إحصائيات لوحة التحكم' : 'Failed to load dashboard stats'}
                onRetry={() => refetchStats()}
              />
            </div>
          ) : (
            statCards.map((stat, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`${stat.bg} p-3 rounded-xl`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t.monthlyRevenue}</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : revenueError ? (
                <div className="h-[300px] flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-sm text-destructive">
                    {language === 'ar' ? 'فشل تحميل بيانات الإيرادات' : 'Failed to load revenue data'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchRevenue()}>
                    <RefreshCw className="h-3 w-3 me-1" />
                    {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </Button>
                </div>
              ) : revenueData && revenueData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [formatMoney(String(value), language), '']}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  {language === 'ar' ? 'لا توجد بيانات إيرادات' : 'No revenue data available'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Status Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {language === 'ar' ? 'حالة الفواتير' : 'Invoice Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoiceStatusData.length > 0 ? (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={invoiceStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {invoiceStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {invoiceStatusData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium ml-auto">
                          {totalForPie > 0 ? Math.round((item.value / totalForPie) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Additional Stats Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'عدد المعاملات' : 'Transaction count'}: {formatNumber(stats.total_payments, language)}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{formatMoney(stats.total_revenue, language)}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'متوسط قيمة الفاتورة' : 'Average Invoice Value'}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-violet-600">{formatMoney(stats.average_invoice_value, language)}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'فواتير متأخرة' : 'Overdue Invoices'}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-red-600">{formatNumber(stats.overdue_invoices, language)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <AlertCircle className="h-6 w-6 mb-2" />
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Income Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {language === 'ar' ? 'اتجاه الإيرادات' : 'Revenue Trend'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : trendsError ? (
                <div className="h-[250px] flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-sm text-destructive">
                    {language === 'ar' ? 'فشل تحميل بيانات الاتجاهات' : 'Failed to load trend data'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchTrends()}>
                    <RefreshCw className="h-3 w-3 me-1" />
                    {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </Button>
                </div>
              ) : trendsData && trendsData.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: 12,
                        }}
                        formatter={(value: string, name: string) => {
                          if (name === 'invoices') return [value, language === 'ar' ? 'الفواتير' : 'Invoices'];
                          return [formatMoney(value, language), language === 'ar' ? 'الإيرادات' : 'Revenue'];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="revenue"
                      />
                      <Line
                        type="monotone"
                        dataKey="payments"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="payments"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  {language === 'ar' ? 'لا توجد بيانات اتجاهات' : 'No trend data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
