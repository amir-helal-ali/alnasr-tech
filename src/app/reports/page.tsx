'use client';

import { useState } from 'react';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
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
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data for reports
const monthlyRevenue = [
  { month: 'يناير', revenue: 125000, invoices: 45, paid: 38, pending: 7 },
  { month: 'فبراير', revenue: 148000, invoices: 52, paid: 44, pending: 8 },
  { month: 'مارس', revenue: 132000, invoices: 48, paid: 39, pending: 9 },
  { month: 'أبريل', revenue: 165000, invoices: 58, paid: 51, pending: 7 },
  { month: 'مايو', revenue: 178000, invoices: 63, paid: 55, pending: 8 },
  { month: 'يونيو', revenue: 195000, invoices: 68, paid: 60, pending: 8 },
];

const topCustomers = [
  { name: 'شركة النيل للتقنية', total: 285000, invoices: 12, lastInvoice: '2024-06-10' },
  { name: 'مؤسسة الأهرام', total: 198000, invoices: 8, lastInvoice: '2024-06-08' },
  { name: 'شركة القاهرة الرقمية', total: 156000, invoices: 6, lastInvoice: '2024-06-05' },
  { name: 'مجموعة الإسكندرية', total: 142000, invoices: 9, lastInvoice: '2024-06-03' },
  { name: 'شركة الدلتا للخدمات', total: 98000, invoices: 5, lastInvoice: '2024-05-28' },
];

const taxSummary = [
  { month: 'يناير', subtotal: 109649, vat: 15351, total: 125000 },
  { month: 'فبراير', subtotal: 129825, vat: 18175, total: 148000 },
  { month: 'مارس', subtotal: 115789, vat: 16211, total: 132000 },
  { month: 'أبريل', subtotal: 144737, vat: 20263, total: 165000 },
  { month: 'مايو', subtotal: 156140, vat: 21860, total: 178000 },
  { month: 'يونيو', subtotal: 171053, vat: 23947, total: 195000 },
];

export default function ReportsPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('revenue');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = (type: string) => {
    toast.success(
      language === 'ar'
        ? `جاري تصدير التقرير بصيغة ${type.toUpperCase()}...`
        : `Exporting report as ${type.toUpperCase()}...`
    );
  };

  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const totalInvoices = monthlyRevenue.reduce((sum, m) => sum + m.invoices, 0);
  const totalPaid = monthlyRevenue.reduce((sum, m) => sum + m.paid, 0);
  const totalPending = monthlyRevenue.reduce((sum, m) => sum + m.pending, 0);
  const totalVAT = taxSummary.reduce((sum, m) => sum + m.vat, 0);
  const revenueGrowth = ((195000 - 125000) / 125000 * 100).toFixed(1);

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
                  {formatCurrency(totalRevenue)}
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
                <p className="text-2xl font-bold text-foreground mt-1">{totalInvoices}</p>
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
                  ? 'تفصيل الإيرادات والفواتير الشهرية للنصف الأول من 2024'
                  : 'Monthly revenue and invoice breakdown for H1 2024'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الشهر' : 'Month'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الفواتير' : 'Invoices'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'مدفوعة' : 'Paid'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'معلقة' : 'Pending'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'نسبة التحصيل' : 'Collection %'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRevenue.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-end font-mono">{formatCurrency(row.revenue)}</TableCell>
                      <TableCell className="text-center">{row.invoices}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          {row.paid}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          {row.pending}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600 font-medium">
                          {((row.paid / row.invoices) * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell className="text-end font-mono">{formatCurrency(totalRevenue)}</TableCell>
                    <TableCell className="text-center">{totalInvoices}</TableCell>
                    <TableCell className="text-center">{totalPaid}</TableCell>
                    <TableCell className="text-center">{totalPending}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-emerald-600">{((totalPaid / totalInvoices) * 100).toFixed(0)}%</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                  ? 'تقرير ضريبة القيمة المضافة المصري (14%) للنصف الأول من 2024'
                  : 'Egyptian VAT (14%) report for H1 2024'}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      {formatCurrency(taxSummary.reduce((s, r) => s + r.subtotal, 0))}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Report */}
        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {language === 'ar' ? 'تقرير أفضل العملاء' : 'Top Customers Report'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'أكبر 5 عملاء من حيث إجمالي المشتريات'
                  : 'Top 5 customers by total purchases'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'عدد الفواتير' : 'Invoice Count'}</TableHead>
                    <TableHead>{language === 'ar' ? 'آخر فاتورة' : 'Last Invoice'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحصة' : 'Share'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((customer, index) => {
                    const share = (customer.total / totalRevenue * 100).toFixed(1);
                    return (
                      <TableRow key={customer.name}>
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
                        <TableCell className="text-end font-mono">{formatCurrency(customer.total)}</TableCell>
                        <TableCell className="text-center">{customer.invoices}</TableCell>
                        <TableCell dir="ltr" className="text-center">{customer.lastInvoice}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{share}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
