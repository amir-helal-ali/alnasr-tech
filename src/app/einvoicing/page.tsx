'use client';

import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileCheck,
  Key,
  Send,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Copy,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

// Mock invoices for dropdown
const mockInvoices = [
  { id: 'INV-20260614-001', customer: 'شركة النيل للتجارة', amount: 15750, tax: 2362.5 },
  { id: 'INV-20260614-002', customer: 'مؤسسة الأهرام', amount: 8200, tax: 1230 },
  { id: 'INV-20260613-003', customer: 'شركة السلام', amount: 23400, tax: 3510 },
  { id: 'INV-20260613-004', customer: 'مصنع الحرية', amount: 5600, tax: 840 },
  { id: 'INV-20260612-005', customer: 'شركة الوادي', amount: 12900, tax: 1935 },
  { id: 'INV-20260611-006', customer: 'مجموعة الفتح', amount: 31200, tax: 4680 },
];

// Mock token data
const mockToken = {
  value: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsLU5hc3IgVGVjaCIsImlhdCI6MTcwMjYxNjAwMCwiZXhwIjoxNzAyNzAyNDAwfQ',
  status: 'active' as const,
  expiresAt: '2026-06-15T14:30:00Z',
  issuedAt: '2026-06-14T14:30:00Z',
};

// Mock submission history
const mockSubmissions = [
  {
    id: 'SUB-001',
    invoiceNumber: 'INV-20260614-001',
    submissionId: 'ETA-9a8b7c6d-5e4f',
    status: 'accepted' as const,
    etaResponse: 'تم قبول الفاتورة بنجاح',
    date: '2026-06-14T10:30:00Z',
    signedBy: 'RSA-SHA256',
  },
  {
    id: 'SUB-002',
    invoiceNumber: 'INV-20260614-002',
    submissionId: 'ETA-1a2b3c4d-5e6f',
    status: 'pending' as const,
    etaResponse: 'جاري المعالجة',
    date: '2026-06-14T11:15:00Z',
    signedBy: 'RSA-SHA256',
  },
  {
    id: 'SUB-003',
    invoiceNumber: 'INV-20260613-003',
    submissionId: 'ETA-7f8e9d0c-1b2a',
    status: 'accepted' as const,
    etaResponse: 'تم قبول الفاتورة بنجاح',
    date: '2026-06-13T09:45:00Z',
    signedBy: 'RSA-SHA256',
  },
  {
    id: 'SUB-004',
    invoiceNumber: 'INV-20260613-004',
    submissionId: 'ETA-3c4d5e6f-7a8b',
    status: 'rejected' as const,
    etaResponse: 'خطأ في بيانات العميل - الرقم الضريبي غير صالح',
    date: '2026-06-13T14:20:00Z',
    signedBy: 'RSA-SHA256',
  },
  {
    id: 'SUB-005',
    invoiceNumber: 'INV-20260612-005',
    submissionId: 'ETA-9e0f1a2b-3c4d',
    status: 'accepted' as const,
    etaResponse: 'تم قبول الفاتورة بنجاح',
    date: '2026-06-12T16:00:00Z',
    signedBy: 'RSA-SHA256',
  },
  {
    id: 'SUB-006',
    invoiceNumber: 'INV-20260611-006',
    submissionId: 'ETA-5e6f7a8b-9c0d',
    status: 'pending' as const,
    etaResponse: 'جاري المراجعة من قبل الهيئة',
    date: '2026-06-11T08:30:00Z',
    signedBy: 'RSA-SHA256',
  },
];

function maskToken(token: string): string {
  if (token.length <= 20) return '••••••••••••';
  return token.substring(0, 15) + '••••••••••••' + token.substring(token.length - 10);
}

function formatDate(dateStr: string, language: 'ar' | 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status, language }: { status: 'accepted' | 'pending' | 'rejected'; language: 'ar' | 'en' }) {
  const config = {
    accepted: {
      label: language === 'ar' ? 'مقبولة' : 'Accepted',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    pending: {
      label: language === 'ar' ? 'معلقة' : 'Pending',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    },
    rejected: {
      label: language === 'ar' ? 'مرفوضة' : 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function EinvoicingPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'active' | 'expired'>(mockToken.status);
  const [showToken, setShowToken] = useState(false);
  const [submissions, setSubmissions] = useState(mockSubmissions);

  const selectedInvoiceData = mockInvoices.find((inv) => inv.id === selectedInvoice);

  const handleSubmitToEta = () => {
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const newSubmission = {
        id: `SUB-${String(submissions.length + 1).padStart(3, '0')}`,
        invoiceNumber: selectedInvoice,
        submissionId: `ETA-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`,
        status: 'pending' as const,
        etaResponse: language === 'ar' ? 'جاري المعالجة' : 'Processing',
        date: new Date().toISOString(),
        signedBy: 'RSA-SHA256',
      };
      setSubmissions([newSubmission, ...submissions]);
      setIsSubmitting(false);
      setSelectedInvoice('');
    }, 2000);
  };

  const handleRefreshToken = () => {
    setIsRefreshingToken(true);
    setTimeout(() => {
      setTokenStatus('active');
      setIsRefreshingToken(false);
    }, 1500);
  };

  const isTokenExpired = new Date(mockToken.expiresAt) < new Date();

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.einvoicing}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'ar'
                ? 'تكامل هيئة الضرائب المصرية للفوترة الإلكترونية'
                : 'Egyptian Tax Authority e-invoicing integration'}
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
            <FileCheck className="h-4 w-4 text-emerald-500" />
            {language === 'ar' ? 'نظام ETA' : 'ETA System'}
          </Badge>
        </div>

        {/* Top Row: Token + RSA Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ETA Token Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{t.etaToken}</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isTokenExpired || tokenStatus === 'expired'
                      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 gap-1'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1'
                  }
                >
                  {isTokenExpired || tokenStatus === 'expired' ? (
                    <>
                      <XCircle className="h-3 w-3" />
                      {language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </>
                  )}
                </Badge>
              </div>
              <CardDescription>
                {language === 'ar'
                  ? 'رمز المصادقة للاتصال بخدمات هيئة الضرائب المصرية'
                  : 'Authentication token for ETA services connection'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Value */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'قيمة الرمز' : 'Token Value'}
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-3 rounded-md text-xs font-mono break-all leading-relaxed border">
                    {showToken ? mockToken.value : maskToken(mockToken.value)}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => setShowToken(!showToken)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(mockToken.value);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Token Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'تاريخ الإصدار' : 'Issued At'}
                  </p>
                  <p className="text-sm font-medium">{formatDate(mockToken.issuedAt, language)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'تاريخ الانتهاء' : 'Expires At'}
                  </p>
                  <p className="text-sm font-medium">{formatDate(mockToken.expiresAt, language)}</p>
                </div>
              </div>

              {/* Refresh Token Button */}
              <Button
                onClick={handleRefreshToken}
                disabled={isRefreshingToken}
                className="w-full"
              >
                {isRefreshingToken ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === 'ar' ? 'جاري التحديث...' : 'Refreshing...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {t.getNewToken}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* RSA-SHA256 Signing Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  {language === 'ar' ? 'التوقيع الرقمي' : 'Digital Signature'}
                </CardTitle>
              </div>
              <CardDescription>
                {language === 'ar'
                  ? 'معلومات توقيع الفواتير'
                  : 'Invoice signing information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'خوارزمية التوقيع' : 'Signing Algorithm'}
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    RSA-SHA256
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'حالة الشهادة' : 'Certificate Status'}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {language === 'ar' ? 'صالحة' : 'Valid'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'انتهاء الشهادة' : 'Cert Expiry'}
                  </span>
                  <span className="text-sm font-medium">2027-01-15</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الفواتير الموقعة' : 'Signed Invoices'}
                  </span>
                  <span className="text-sm font-bold text-primary">1,247</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {language === 'ar'
                      ? 'يجب تجديد الشهادة قبل تاريخ 15 يناير 2027 لضمان استمرار تقديم الفواتير'
                      : 'Certificate must be renewed before Jan 15, 2027 to ensure continued invoice submission'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Invoice Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {language === 'ar' ? 'تقديم فاتورة' : 'Submit Invoice'}
              </CardTitle>
            </div>
            <CardDescription>
              {language === 'ar'
                ? 'اختر فاتورة وتقديمها لهيئة الضرائب المصرية'
                : 'Select an invoice and submit it to the Egyptian Tax Authority'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'اختر الفاتورة' : 'Select Invoice'}
                </label>
                <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={language === 'ar' ? 'اختر فاتورة...' : 'Select invoice...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {mockInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.id} - {inv.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <Button
                  onClick={handleSubmitToEta}
                  disabled={!selectedInvoice || isSubmitting}
                  className="w-full h-9"
                  size="default"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === 'ar' ? 'جاري التقديم...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t.submitToEta}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Invoice Preview */}
            {selectedInvoiceData && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  {language === 'ar' ? 'معاينة بيانات الفاتورة' : 'Invoice Data Preview'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.invoiceNumber}</p>
                    <p className="text-sm font-medium font-mono">{selectedInvoiceData.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.customer}</p>
                    <p className="text-sm font-medium">{selectedInvoiceData.customer}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.amount}</p>
                    <p className="text-sm font-medium">
                      {selectedInvoiceData.amount.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.tax}</p>
                    <p className="text-sm font-medium">
                      {selectedInvoiceData.tax.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-semibold">
                    {t.total}:{' '}
                    {(selectedInvoiceData.amount + selectedInvoiceData.tax).toLocaleString()}{' '}
                    {language === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs gap-1">
                    <Shield className="h-3 w-3" />
                    RSA-SHA256
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission History Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  {language === 'ar' ? 'سجل التقديمات' : 'Submission History'}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {submissions.length} {language === 'ar' ? 'تقديم' : 'submissions'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.invoiceNumber}</TableHead>
                    <TableHead>{language === 'ar' ? 'معرف التقديم' : 'Submission ID'}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.etaResponse}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs">{sub.invoiceNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {sub.submissionId}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} language={language} />
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {sub.etaResponse}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(sub.date, language)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <Eye className="h-3 w-3" />
                          {language === 'ar' ? 'عرض' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
