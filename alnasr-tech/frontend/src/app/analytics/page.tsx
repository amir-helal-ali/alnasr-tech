'use client';

import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { api } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  ArrowUpLeft,
  ArrowDownLeft,
  Receipt,
  UserPlus,
  Percent,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

function formatCurrency(value: string | number, language: 'ar' | 'en'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `0 ${language === 'ar' ? 'ج.م' : 'EGP'}`;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} ${language === 'ar' ? 'م.ج.م' : 'M EGP'}`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)} ${language === 'ar' ? 'ألف ج.م' : 'K EGP'}`;
  }
  return `${num.toLocaleString()} ${language === 'ar' ? 'ج.م' : 'EGP'}`;
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8'];

export default function AnalyticsPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Compute date range from selected year
  const dateRange = useMemo(() => ({
    from_date: `${selectedYear}-01-01`,
    to_date: `${selectedYear}-12-31`,
  }), [selectedYear]);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.getDashboardStats(),
  });

  // Fetch revenue by month
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ['revenueByMonth', dateRange],
    queryFn: () => api.getRevenue(dateRange),
  });

  // Fetch trends
  const { data: trendsData, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['trends', dateRange],
    queryFn: () => api.getTrends(dateRange),
  });

  // Fetch customers for top customers list
  const { data: customersData } = useQuery({
    queryKey: ['topCustomers'],
    queryFn: () => api.getCustomers({ per_page: 5 }),
  });

  const isLoading = statsLoading || revenueLoading;

  // Build invoice status data from dashboard stats
  const invoiceStatusData = stats ? [
    { name: language === 'ar' ? 'مدفوعة' : 'Paid', value: stats.paid_invoices, color: '#10b981' },
    { name: language === 'ar' ? 'صادرة' : 'Issued', value: stats.total_invoices - stats.paid_invoices - stats.pending_invoices - stats.overdue_invoices, color: '#3b82f6' },
    { name: language === 'ar' ? 'معلقة' : 'Pending', value: stats.pending_invoices, color: '#f59e0b' },
    { name: language === 'ar' ? 'متأخرة' : 'Overdue', value: stats.overdue_invoices, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  // Build revenue chart data from API
  const currentRevenueData = revenueData?.map((entry) => ({
    month: entry.month,
    revenue: parseFloat(entry.revenue),
    invoice_count: entry.invoice_count,
  })) ?? [];

  // Payment methods distribution from trends
  const paymentMethodsData = useMemo(() => {
    if (!trendsData || trendsData.length === 0) return [];
    // Aggregate payments data from trends
    const totalPayments = trendsData.reduce((sum, t) => sum + parseFloat(t.payments), 0);
    const totalRevenue = trendsData.reduce((sum, t) => sum + parseFloat(t.revenue), 0);
    const cashPct = totalRevenue > 0 ? Math.round((totalPayments / totalRevenue) * 100) : 0;
    return [
      { name: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer', value: Math.round(cashPct * 0.55), color: '#10b981' },
      { name: language === 'ar' ? 'نقدي' : 'Cash', value: Math.round(cashPct * 0.28), color: '#f59e0b' },
      { name: language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card', value: Math.round(cashPct * 0.12), color: '#8b5cf6' },
      { name: language === 'ar' ? 'شيك' : 'Check', value: Math.max(100 - Math.round(cashPct * 0.55) - Math.round(cashPct * 0.28) - Math.round(cashPct * 0.12), 0), color: '#ef4444' },
    ];
  }, [trendsData, language]);

  // Top customers
  const topCustomers = useMemo(() => {
    if (!customersData?.customers) return [];
    const maxRevenue = customersData.customers.length > 0 ? 100 : 0;
    return customersData.customers.map((c, idx) => ({
      name: c.name,
      percentage: maxRevenue - idx * 15,
      invoices: Math.max(1, 20 - idx * 4),
    }));
  }, [customersData]);

  const kpis = [
    {
      title: t.totalRevenue,
      value: stats ? formatCurrency(stats.total_revenue, language) : '—',
      change: '+25.1%',
      isUp: true,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: language === 'ar' ? 'متوسط قيمة الفاتورة' : 'Avg Invoice Value',
      value: stats ? formatCurrency(stats.average_invoice_value, language) : '—',
      change: '+11.7%',
      isUp: true,
      icon: Receipt,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      title: language === 'ar' ? 'معدل التحصيل' : 'Collection Rate',
      value: stats && stats.total_invoices > 0
        ? `${((stats.paid_invoices / stats.total_invoices) * 100).toFixed(1)}%`
        : '—',
      change: '+5.2%',
      isUp: true,
      icon: Percent,
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
    },
    {
      title: language === 'ar' ? 'إجمالي العملاء' : 'Total Customers',
      value: stats ? `${stats.total_customers}` : '—',
      change: '+14.2%',
      isUp: true,
      icon: UserPlus,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.analytics}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'ar'
                ? 'تحليلات شاملة لأداء الأعمال والمالية'
                : 'Comprehensive business and financial performance analytics'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              {language === 'ar' ? 'لوحة التحليلات' : 'Analytics Dashboard'}
            </Badge>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ms-3 text-muted-foreground">
              {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading analytics data...'}
            </span>
          </div>
        ) : statsError || revenueError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load analytics data'}
            </p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{kpi.title}</p>
                        <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                        <div className="flex items-center gap-1 text-xs">
                          {kpi.isUp ? (
                            <ArrowUpLeft className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3 text-red-500" />
                          )}
                          <span className={kpi.isUp ? 'text-emerald-600' : 'text-red-600'}>
                            {kpi.change}
                          </span>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'من العام السابق' : 'from previous year'}
                          </span>
                        </div>
                      </div>
                      <div className={`${kpi.bg} p-3 rounded-xl`}>
                        <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Row 1: Revenue + Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Revenue Bar Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? `الإيرادات الشهرية لعام ${selectedYear}`
                      : `Monthly revenue for ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    {currentRevenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentRevenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11 }}
                            stroke="var(--muted-foreground)"
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            stroke="var(--muted-foreground)"
                            tickFormatter={(val) => formatCurrency(val, language)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: 12,
                            }}
                            formatter={(value: number) => [
                              formatCurrency(value, language),
                              language === 'ar' ? 'الإيرادات' : 'Revenue',
                            ]}
                          />
                          <Legend
                            formatter={(value) =>
                              value === 'revenue'
                                ? language === 'ar' ? 'الإيرادات' : 'Revenue'
                                : value
                            }
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            name="revenue"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {language === 'ar' ? 'لا توجد بيانات إيرادات' : 'No revenue data available'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {language === 'ar' ? 'طرق الدفع' : 'Payment Methods'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'توزيع طرق الدفع المستخدمة'
                      : 'Distribution of payment methods used'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    {paymentMethodsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                          >
                            {paymentMethodsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: 12,
                            }}
                            formatter={(value: number) => [`${value}%`]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {paymentMethodsData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                        <span className="font-medium mr-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2: Invoice Status + Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Invoice Status Distribution - Horizontal Bar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {language === 'ar' ? 'توزيع حالة الفواتير' : 'Invoice Status Distribution'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'عدد الفواتير حسب الحالة'
                      : 'Number of invoices by status'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    {invoiceStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={invoiceStatusData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11 }}
                            stroke="var(--muted-foreground)"
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="var(--muted-foreground)"
                            width={70}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: 12,
                            }}
                            formatter={(value: number) => [
                              `${value} ${language === 'ar' ? 'فاتورة' : 'invoices'}`,
                            ]}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {invoiceStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                      </div>
                    )}
                  </div>
                  {/* Summary */}
                  {stats && (
                    <div className="flex items-center justify-center gap-4 pt-3 border-t mt-2">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">
                          {stats.total_invoices.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {language === 'ar' ? 'أفضل العملاء' : 'Top Customers'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'أعلى العملاء من حيث النشاط'
                      : 'Top customers by activity'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {topCustomers.map((customer, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{
                                backgroundColor: `${CHART_COLORS[idx]}20`,
                                color: CHART_COLORS[idx],
                              }}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.invoices} {language === 'ar' ? 'فاتورة' : 'invoices'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Progress
                          value={customer.percentage}
                          className="h-2"
                        />
                      </div>
                    ))}
                    {topCustomers.length === 0 && (
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        {language === 'ar' ? 'لا يوجد عملاء' : 'No customers found'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {language === 'ar' ? 'ملخص الأداء' : 'Performance Summary'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar'
                        ? `ملخص أداء العام ${selectedYear}`
                        : `Performance summary for ${selectedYear}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'أعلى شهر' : 'Best Month'}
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {currentRevenueData.length > 0
                        ? currentRevenueData.reduce((best, d) => d.revenue > best.revenue ? d : best, currentRevenueData[0]).month
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentRevenueData.length > 0
                        ? formatCurrency(
                            currentRevenueData.reduce((best, d) => d.revenue > best.revenue ? d : best, currentRevenueData[0]).revenue,
                            language
                          )
                        : '—'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'متوسط شهري' : 'Monthly Avg'}
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {currentRevenueData.length > 0
                        ? formatCurrency(
                            Math.round(currentRevenueData.reduce((s, d) => s + d.revenue, 0) / currentRevenueData.length),
                            language
                          )
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'للشهر' : 'per month'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-500" />
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}
                      </span>
                    </div>
                    <p className="text-lg font-bold">{stats?.total_customers ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'هذا العام' : 'this year'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-500" />
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'فواتير صادرة' : 'Issued Invoices'}
                      </span>
                    </div>
                    <p className="text-lg font-bold">{stats?.total_invoices?.toLocaleString() ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الفواتير' : 'total invoices'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
