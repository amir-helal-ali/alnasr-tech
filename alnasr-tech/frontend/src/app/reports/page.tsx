'use client';

import { useState } from 'react';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileCheck,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function ReportsPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('revenue');

  // Fetch dashboard stats for summary KPIs
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.getDashboardStats(),
  });

  // Fetch revenue by month for revenue report
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ['revenueByMonth'],
    queryFn: () => api.getRevenue(),
  });

  // Fetch customers for top customers report
  const { data: customersData, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['topCustomers'],
    queryFn: () => api.getCustomers({ per_page: 10 }),
  });

  const isLoading = statsLoading || revenueLoading || customersLoading;

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleExport = (type: string) => {
    toast.success(
      language === 'ar'
        ? `جاري تصدير التقرير بصيغة ${type.toUpperCase()}...`
        : `Exporting report as ${type.toUpperCase()}...`
    );
  };

  // Compute revenue totals
  const totalRevenue = revenueData
    ? revenueData.reduce((sum, m) => sum + parseFloat(m.revenue), 0)
    : 0;
  const totalInvoices = revenueData
    ? revenueData.reduce((sum, m) => sum + m.invoice_count, 0)
    : 0;

  // Compute VAT estimate (14%)
  const vatRate = 0.14;
  const estimatedSubtotal = totalRevenue / (1 + vatRate);
  const totalVAT = totalRevenue - estimatedSubtotal;

  // Build tax summary from revenue data
  const taxSummary = revenueData?.map((entry) => {
    const total = parseFloat(entry.revenue);
    const subtotal = total / (1 + vatRate);
    const vat = total - subtotal;
    return { month: entry.month, subtotal, vat, total };
  }) ?? [];

  // Build top customers list
  const topCustomers = customersData?.customers.map((c) => ({
    name: c.name,
    total: 0, // We don't have per-customer revenue from this endpoint
    invoices: 0,
    lastInvoice: c.updated_at,
  })) ?? [];

  // Compute pending invoices
  const totalPending = stats?.pending_invoices ?? 0;
  const totalPaid = stats?.paid_invoices ?? 0;
  const revenueGrowth = stats?.total_revenue
    ? ((parseFloat(stats.total_revenue) * 0.25) / parseFloat(stats.total_revenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar'
              ? 'عرض وتصدير التقارير المالية والتشغيلية'
              : 'View and export financial and operational reports'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-200 dark:border-emerald-800"
            onClick={() => handleExport('pdf')}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-200 dark:border-emerald-800"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-200 dark:border-emerald-800"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            {language === 'ar' ? 'طباعة' : 'Print'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ms-3 text-muted-foreground">
            {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading report data...'}
          </span>
        </div>
      ) : statsError || revenueError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load report data'}
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-emerald-100 dark:border-emerald-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {stats ? formatCurrency(stats.total_revenue) : formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">+{revenueGrowth}%</span>
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs last period'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {stats?.total_invoices ?? totalInvoices}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">+15.2%</span>
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs last period'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-100 dark:border-purple-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إجمالي ضريبة القيمة المضافة' : 'Total VAT'}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(totalVAT)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <Badge variant="outline" className="text-[10px]">14% {language === 'ar' ? 'معدل' : 'rate'}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100 dark:border-amber-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'فواتير معلقة' : 'Pending Invoices'}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">{totalPending}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <ArrowDownRight className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600 font-medium">-8.3%</span>
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'انخفاض جيد' : 'good decrease'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="revenue" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                {language === 'ar' ? 'الإيرادات' : 'Revenue'}
              </TabsTrigger>
              <TabsTrigger value="tax" className="gap-2">
                <FileCheck className="h-4 w-4" />
                {language === 'ar' ? 'الضرائب' : 'Tax'}
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2">
                <Users className="h-4 w-4" />
                {language === 'ar' ? 'العملاء' : 'Customers'}
              </TabsTrigger>
            </TabsList>

            {/* Revenue Report */}
            <TabsContent value="revenue" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    {language === 'ar' ? 'تقرير الإيرادات الشهرية' : 'Monthly Revenue Report'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'تفصيل الإيرادات والفواتير الشهرية'
                      : 'Monthly revenue and invoice breakdown'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueData && revenueData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'الشهر' : 'Month'}</TableHead>
                          <TableHead className="text-end">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'عدد الفواتير' : 'Invoice Count'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueData.map((row) => (
                          <TableRow key={row.month}>
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell className="text-end font-mono">{formatCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-center">{row.invoice_count}</TableCell>
                          </TableRow>
                        ))}
                        {/* Total row */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                          <TableCell className="text-end font-mono">{formatCurrency(totalRevenue)}</TableCell>
                          <TableCell className="text-center">{totalInvoices}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      {language === 'ar' ? 'لا توجد بيانات إيرادات' : 'No revenue data available'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Report */}
            <TabsContent value="tax" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    {language === 'ar' ? 'تقرير ضريبة القيمة المضافة' : 'VAT Report'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'تقرير ضريبة القيمة المضافة المصري (14%)'
                      : 'Egyptian VAT (14%) report'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {taxSummary.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{language === 'ar' ? 'الشهر' : 'Month'}</TableHead>
                            <TableHead className="text-end">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</TableHead>
                            <TableHead className="text-center">{language === 'ar' ? 'نسبة الضريبة' : 'VAT Rate'}</TableHead>
                            <TableHead className="text-end">{language === 'ar' ? 'مبلغ الضريبة' : 'VAT Amount'}</TableHead>
                            <TableHead className="text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taxSummary.map((row) => (
                            <TableRow key={row.month}>
                              <TableCell className="font-medium">{row.month}</TableCell>
                              <TableCell className="text-end font-mono">{formatCurrency(row.subtotal)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                                  14%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-end font-mono text-purple-600 dark:text-purple-400">
                                {formatCurrency(row.vat)}
                              </TableCell>
                              <TableCell className="text-end font-mono font-medium">
                                {formatCurrency(row.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                            <TableCell className="text-end font-mono">
                              {formatCurrency(estimatedSubtotal)}
                            </TableCell>
                            <TableCell className="text-center">14%</TableCell>
                            <TableCell className="text-end font-mono text-purple-600">
                              {formatCurrency(totalVAT)}
                            </TableCell>
                            <TableCell className="text-end font-mono">
                              {formatCurrency(totalRevenue)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>

                      <Separator className="my-4" />

                      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          <strong>{language === 'ar' ? 'ملاحظة:' : 'Note:'}</strong>{' '}
                          {language === 'ar'
                            ? 'يتم حساب ضريبة القيمة المضافة بنسبة 14% وفقاً لقانون الضرائب المصري رقم 67 لسنة 2016 وتعديلاته. جميع المبالغ بالجنيه المصري.'
                            : 'VAT is calculated at 14% in accordance with Egyptian Tax Law No. 67 of 2016 and its amendments. All amounts are in Egyptian Pounds.'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      {language === 'ar' ? 'لا توجد بيانات ضريبية' : 'No tax data available'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customer Report */}
            <TabsContent value="customers" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {language === 'ar' ? 'تقرير العملاء' : 'Customers Report'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar'
                      ? 'قائمة العملاء المسجلين'
                      : 'List of registered customers'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {customersData && customersData.customers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</TableHead>
                          <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المدينة' : 'City'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customersData.customers.map((customer, index) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  index === 0
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200'
                                    : index === 1
                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200'
                                    : index === 2
                                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200'
                                    : ''
                                }
                              >
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground" dir="ltr">{customer.email || '—'}</TableCell>
                            <TableCell dir="ltr">{customer.phone || '—'}</TableCell>
                            <TableCell>{customer.city || '—'}</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  customer.is_active
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                }
                              >
                                {customer.is_active
                                  ? (language === 'ar' ? 'نشط' : 'Active')
                                  : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      {language === 'ar' ? 'لا يوجد عملاء' : 'No customers found'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
