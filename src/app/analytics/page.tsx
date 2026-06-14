'use client';

import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
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
} from 'lucide-react';
import { useState } from 'react';

// Monthly revenue data for 12 months
const monthlyRevenueData: Record<string, { month: string; revenue: number; expenses: number }[]> = {
  '2026': [
    { month: 'يناير', revenue: 425000, expenses: 280000 },
    { month: 'فبراير', revenue: 448000, expenses: 295000 },
    { month: 'مارس', revenue: 562000, expenses: 340000 },
    { month: 'أبريل', revenue: 435000, expenses: 310000 },
    { month: 'مايو', revenue: 578000, expenses: 360000 },
    { month: 'يونيو', revenue: 695000, expenses: 410000 },
    { month: 'يوليو', revenue: 620000, expenses: 385000 },
    { month: 'أغسطس', revenue: 540000, expenses: 345000 },
    { month: 'سبتمبر', revenue: 610000, expenses: 370000 },
    { month: 'أكتوبر', revenue: 680000, expenses: 400000 },
    { month: 'نوفمبر', revenue: 720000, expenses: 420000 },
    { month: 'ديسمبر', revenue: 780000, expenses: 450000 },
  ],
  '2025': [
    { month: 'يناير', revenue: 320000, expenses: 220000 },
    { month: 'فبراير', revenue: 348000, expenses: 235000 },
    { month: 'مارس', revenue: 410000, expenses: 275000 },
    { month: 'أبريل', revenue: 335000, expenses: 240000 },
    { month: 'مايو', revenue: 430000, expenses: 290000 },
    { month: 'يونيو', revenue: 495000, expenses: 320000 },
    { month: 'يوليو', revenue: 460000, expenses: 300000 },
    { month: 'أغسطس', revenue: 410000, expenses: 280000 },
    { month: 'سبتمبر', revenue: 470000, expenses: 310000 },
    { month: 'أكتوبر', revenue: 520000, expenses: 330000 },
    { month: 'نوفمبر', revenue: 550000, expenses: 350000 },
    { month: 'ديسمبر', revenue: 600000, expenses: 380000 },
  ],
};

// Payment methods distribution
const paymentMethodsData = [
  { name: 'تحويل بنكي', value: 42, color: '#10b981' },
  { name: 'نقدي', value: 28, color: '#f59e0b' },
  { name: 'بطاقة ائتمان', value: 18, color: '#8b5cf6' },
  { name: 'شيك', value: 12, color: '#ef4444' },
];

// Invoice status distribution
const invoiceStatusData = [
  { name: 'مدفوعة', value: 1245, color: '#10b981' },
  { name: 'صادرة', value: 487, color: '#3b82f6' },
  { name: 'معلقة', value: 312, color: '#f59e0b' },
  { name: 'مسودة', value: 198, color: '#94a3b8' },
  { name: 'ملغاة', value: 89, color: '#ef4444' },
];

// Top customers
const topCustomers = [
  { name: 'شركة النيل للتجارة', revenue: 487000, percentage: 100, invoices: 52 },
  { name: 'مؤسسة الأهرام', revenue: 356000, percentage: 73, invoices: 38 },
  { name: 'شركة السلام', revenue: 298000, percentage: 61, invoices: 31 },
  { name: 'مصنع الحرية', revenue: 215000, percentage: 44, invoices: 24 },
  { name: 'شركة الوادي', revenue: 178000, percentage: 37, invoices: 19 },
];

// KPI data
const kpiData = {
  '2026': {
    totalRevenue: 6_693_000,
    avgInvoiceValue: 3285,
    collectionRate: 87.5,
    customerGrowth: 14.2,
  },
  '2025': {
    totalRevenue: 5_348_000,
    avgInvoiceValue: 2940,
    collectionRate: 82.3,
    customerGrowth: 11.8,
  },
};

function formatCurrency(value: number, language: 'ar' | 'en'): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} ${language === 'ar' ? 'م.ج.م' : 'M EGP'}`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} ${language === 'ar' ? 'ألف ج.م' : 'K EGP'}`;
  }
  return `${value.toLocaleString()} ${language === 'ar' ? 'ج.م' : 'EGP'}`;
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8'];

export default function AnalyticsPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const currentRevenueData = monthlyRevenueData[selectedYear] || monthlyRevenueData['2026'];
  const currentKpi = kpiData[selectedYear as keyof typeof kpiData] || kpiData['2026'];

  const kpis = [
    {
      title: t.totalRevenue,
      value: formatCurrency(currentKpi.totalRevenue, language),
      change: selectedYear === '2026' ? '+25.1%' : '+18.4%',
      isUp: true,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: language === 'ar' ? 'متوسط قيمة الفاتورة' : 'Avg Invoice Value',
      value: `${currentKpi.avgInvoiceValue.toLocaleString()} ${language === 'ar' ? 'ج.م' : 'EGP'}`,
      change: selectedYear === '2026' ? '+11.7%' : '+8.3%',
      isUp: true,
      icon: Receipt,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      title: language === 'ar' ? 'معدل التحصيل' : 'Collection Rate',
      value: `${currentKpi.collectionRate}%`,
      change: selectedYear === '2026' ? '+5.2%' : '+3.1%',
      isUp: true,
      icon: Percent,
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
    },
    {
      title: language === 'ar' ? 'نمو العملاء' : 'Customer Growth',
      value: `${currentKpi.customerGrowth}%`,
      change: selectedYear === '2026' ? '+2.4%' : '+1.9%',
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
                  ? `الإيرادات والمصروفات الشهرية لعام ${selectedYear}`
                  : `Monthly revenue and expenses for ${selectedYear}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
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
                      formatter={(value: number, name: string) => [
                        formatCurrency(value, language),
                        name,
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'revenue'
                          ? language === 'ar'
                            ? 'الإيرادات'
                            : 'Revenue'
                          : language === 'ar'
                            ? 'المصروفات'
                            : 'Expenses'
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="revenue"
                    />
                    <Bar
                      dataKey="expenses"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      name="expenses"
                      opacity={0.7}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
              </div>
              {/* Summary */}
              <div className="flex items-center justify-center gap-4 pt-3 border-t mt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {invoiceStatusData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}
                  </p>
                </div>
              </div>
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
                  ? 'أعلى 5 عملاء من حيث الإيرادات'
                  : 'Top 5 customers by revenue'}
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
                      <p className="text-sm font-semibold">
                        {formatCurrency(customer.revenue, language)}
                      </p>
                    </div>
                    <Progress
                      value={customer.percentage}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <span className="text-sm font-semibold">
                  {language === 'ar' ? 'إجمالي أفضل العملاء' : 'Top Customers Total'}
                </span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(
                    topCustomers.reduce((sum, c) => sum + c.revenue, 0),
                    language
                  )}
                </span>
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
                <p className="text-lg font-bold">{language === 'ar' ? 'ديسمبر' : 'December'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(780000, language)}
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
                  {formatCurrency(
                    Math.round(currentRevenueData.reduce((s, d) => s + d.revenue, 0) / 12),
                    language
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'للشهر' : 'per month'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'عملاء جدد' : 'New Customers'}
                  </span>
                </div>
                <p className="text-lg font-bold">184</p>
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
                <p className="text-lg font-bold">2,331</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الفواتير' : 'total invoices'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
