'use client';

import { useAppSettings, useAuthStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUpLeft,
  ArrowDownLeft,
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

// Mock data for demonstration
const revenueData = [
  { month: 'يناير', revenue: 125000, invoices: 45 },
  { month: 'فبراير', revenue: 148000, invoices: 52 },
  { month: 'مارس', revenue: 162000, invoices: 58 },
  { month: 'أبريل', revenue: 135000, invoices: 48 },
  { month: 'مايو', revenue: 178000, invoices: 62 },
  { month: 'يونيو', revenue: 195000, invoices: 68 },
];

const trendData = [
  { period: 'أسبوع 1', income: 42000, expenses: 28000 },
  { period: 'أسبوع 2', income: 38000, expenses: 22000 },
  { period: 'أسبوع 3', income: 55000, expenses: 35000 },
  { period: 'أسبوع 4', income: 48000, expenses: 30000 },
];

const invoiceStatusData = [
  { name: 'مدفوعة', value: 45, color: '#22c55e' },
  { name: 'صادرة', value: 25, color: '#3b82f6' },
  { name: 'معلقة', value: 18, color: '#f59e0b' },
  { name: 'ملغاة', value: 7, color: '#ef4444' },
];

const recentInvoices = [
  { id: '1', number: 'INV-20260614-001', customer: 'شركة النيل للتجارة', amount: '15,750 ج.م', status: 'paid' },
  { id: '2', number: 'INV-20260614-002', customer: 'مؤسسة الأهرام', amount: '8,200 ج.م', status: 'issued' },
  { id: '3', number: 'INV-20260613-003', customer: 'شركة السلام', amount: '23,400 ج.م', status: 'draft' },
  { id: '4', number: 'INV-20260613-004', customer: 'مصنع الحرية', amount: '5,600 ج.م', status: 'paid' },
  { id: '5', number: 'INV-20260612-005', customer: 'شركة الوادي', amount: '12,900 ج.م', status: 'submitted' },
];

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'مدفوعة', variant: 'default' },
  issued: { label: 'صادرة', variant: 'secondary' },
  draft: { label: 'مسودة', variant: 'outline' },
  submitted: { label: 'مُقدمة', variant: 'secondary' },
  accepted: { label: 'مقبولة', variant: 'default' },
  cancelled: { label: 'ملغاة', variant: 'destructive' },
};

export default function DashboardPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const stats = [
    {
      title: t.totalRevenue,
      value: '843,000 ج.م',
      change: '+12.5%',
      isUp: true,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: t.totalCustomers,
      value: '1,284',
      change: '+8.2%',
      isUp: true,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: t.totalInvoices,
      value: '3,456',
      change: '+15.3%',
      isUp: true,
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      title: t.pendingInvoices,
      value: '127',
      change: '-3.1%',
      isUp: false,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: t.paidInvoices,
      value: '2,891',
      change: '+18.7%',
      isUp: true,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: t.overdueAmount,
      value: '45,600 ج.م',
      change: '-5.2%',
      isUp: false,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

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
            {language === 'ar' ? 'يونيو ٢٠٢٦' : 'June 2026'}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {stat.isUp ? (
                        <ArrowUpLeft className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ArrowDownLeft className="h-3 w-3 text-red-500" />
                      )}
                      <span className={stat.isUp ? 'text-emerald-600' : 'text-red-600'}>
                        {stat.change}
                      </span>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'من الشهر السابق' : 'from last month'}
                      </span>
                    </div>
                  </div>
                  <div className={`${stat.bg} p-3 rounded-xl`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t.monthlyRevenue}</CardTitle>
            </CardHeader>
            <CardContent>
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
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'الإيرادات' : 'Revenue'} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                    <span className="font-medium ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Invoices */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t.recentInvoices}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.customer}</p>
                        <p className="text-xs text-muted-foreground">{invoice.number}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-semibold">{invoice.amount}</p>
                      <Badge variant={statusMap[invoice.status]?.variant || 'outline'} className="text-[10px]">
                        {statusMap[invoice.status]?.label || invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Income Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {language === 'ar' ? 'اتجاه الدخل' : 'Income Trend'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
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
                    />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name={language === 'ar' ? 'الدخل' : 'Income'} />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name={language === 'ar' ? 'المصروفات' : 'Expenses'} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
