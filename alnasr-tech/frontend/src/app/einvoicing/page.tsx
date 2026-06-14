'use client';

import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { api, EtaSubmission, Invoice } from '@/lib/api';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

function StatusBadge({ status, language }: { status: string; language: 'ar' | 'en' }) {
  const config: Record<string, {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
  }> = {
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
    submitted: {
      label: language === 'ar' ? 'تم التقديم' : 'Submitted',
      icon: Send,
      className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
    },
  };

  const entry = config[status] || {
    label: status,
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  };
  const Icon = entry.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${entry.className}`}>
      <Icon className="h-3 w-3" />
      {entry.label}
    </Badge>
  );
}

export default function EinvoicingPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const queryClient = useQueryClient();

  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [showToken, setShowToken] = useState(false);

  // Fetch ETA token
  const { data: tokenData, isLoading: tokenLoading, error: tokenError, refetch: refetchToken } = useQuery({
    queryKey: ['etaToken'],
    queryFn: () => api.getEtaToken(),
  });

  // Fetch issued invoices for submission
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ['issuedInvoices'],
    queryFn: () => api.getInvoices({ status: 'issued', per_page: 50 }),
  });

  // Fetch recent submissions (using submitted invoices as proxy)
  const { data: submittedInvoicesData, isLoading: submissionsLoading, error: submissionsError } = useQuery({
    queryKey: ['submittedInvoices'],
    queryFn: () => api.getInvoices({ per_page: 20 }),
  });

  // Submit invoice mutation
  const submitMutation = useMutation({
    mutationFn: (invoice_id: string) => api.submitInvoice(invoice_id),
    onSuccess: (data: EtaSubmission) => {
      toast.success(
        language === 'ar'
          ? 'تم تقديم الفاتورة بنجاح'
          : 'Invoice submitted successfully'
      );
      setSelectedInvoice('');
      // Refresh the invoices and submissions lists
      queryClient.invalidateQueries({ queryKey: ['issuedInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['submittedInvoices'] });
    },
    onError: (error: Error) => {
      toast.error(
        language === 'ar'
          ? `فشل تقديم الفاتورة: ${error.message}`
          : `Failed to submit invoice: ${error.message}`
      );
    },
  });

  const issuedInvoices = invoicesData?.invoices ?? [];
  const selectedInvoiceData = issuedInvoices.find((inv: Invoice) => inv.id === selectedInvoice);

  // Build submission history from invoices that have been submitted/accepted
  const submissions = submittedInvoicesData?.invoices
    ?.filter((inv: Invoice) => ['submitted', 'accepted'].includes(inv.status))
    ?.map((inv: Invoice) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      etaResponse: inv.status === 'accepted'
        ? (language === 'ar' ? 'تم قبول الفاتورة بنجاح' : 'Invoice accepted')
        : (language === 'ar' ? 'جاري المعالجة' : 'Processing'),
      date: inv.updated_at,
    })) ?? [];

  const isTokenExpired = tokenData
    ? Date.now() / 1000 > (tokenData.expires_in || 0)
    : false;

  const handleRefreshToken = () => {
    refetchToken();
  };

  const handleSubmitToEta = () => {
    if (!selectedInvoice) return;
    submitMutation.mutate(selectedInvoice);
  };

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
                    tokenError || isTokenExpired
                      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 gap-1'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1'
                  }
                >
                  {tokenError || isTokenExpired ? (
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
              {tokenLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ms-2 text-sm text-muted-foreground">
                    {language === 'ar' ? 'جاري تحميل الرمز...' : 'Loading token...'}
                  </span>
                </div>
              ) : tokenError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {language === 'ar' ? 'فشل تحميل الرمز' : 'Failed to load token'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{tokenError.message}</p>
                </div>
              ) : tokenData ? (
                <>
                  {/* Token Value */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'قيمة الرمز' : 'Token Value'}
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted p-3 rounded-md text-xs font-mono break-all leading-relaxed border">
                        {showToken ? tokenData.access_token : maskToken(tokenData.access_token)}
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
                          navigator.clipboard.writeText(tokenData.access_token);
                          toast.success(language === 'ar' ? 'تم نسخ الرمز' : 'Token copied');
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
                        {language === 'ar' ? 'نوع الرمز' : 'Token Type'}
                      </p>
                      <p className="text-sm font-medium">{tokenData.token_type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'مدة الصلاحية' : 'Expires In'}
                      </p>
                      <p className="text-sm font-medium">
                        {Math.round(tokenData.expires_in / 60)} {language === 'ar' ? 'دقيقة' : 'minutes'}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Refresh Token Button */}
              <Button
                onClick={handleRefreshToken}
                disabled={tokenLoading}
                className="w-full"
              >
                {tokenLoading ? (
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
                  <span className="text-sm font-bold text-primary">
                    {submissions.length.toLocaleString()}
                  </span>
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
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ms-2 text-sm text-muted-foreground">
                  {language === 'ar' ? 'جاري تحميل الفواتير...' : 'Loading invoices...'}
                </span>
              </div>
            ) : invoicesError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {language === 'ar' ? 'فشل تحميل الفواتير' : 'Failed to load invoices'}
                </p>
              </div>
            ) : (
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
                      {issuedInvoices.length > 0 ? (
                        issuedInvoices.map((inv: Invoice) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoice_number} - {inv.customer?.name || inv.customer_id}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {language === 'ar' ? 'لا توجد فواتير صادرة' : 'No issued invoices'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <div className="flex items-end">
                  <Button
                    onClick={handleSubmitToEta}
                    disabled={!selectedInvoice || submitMutation.isPending}
                    className="w-full h-9"
                    size="default"
                  >
                    {submitMutation.isPending ? (
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
            )}

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
                    <p className="text-sm font-medium font-mono">{selectedInvoiceData.invoice_number}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.customer}</p>
                    <p className="text-sm font-medium">{selectedInvoiceData.customer?.name || selectedInvoiceData.customer_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.amount}</p>
                    <p className="text-sm font-medium">
                      {parseFloat(selectedInvoiceData.subtotal).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.tax}</p>
                    <p className="text-sm font-medium">
                      {parseFloat(selectedInvoiceData.tax_amount).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-semibold">
                    {t.total}:{' '}
                    {parseFloat(selectedInvoiceData.total).toLocaleString()}{' '}
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
            {submissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ms-2 text-sm text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </span>
              </div>
            ) : submissions.length > 0 ? (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.invoiceNumber}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.etaResponse}</TableHead>
                      <TableHead>{t.date}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-xs">{sub.invoiceNumber}</TableCell>
                        <TableCell>
                          <StatusBadge status={sub.status} language={language} />
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {sub.etaResponse}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(sub.date, language)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileCheck className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد تقديمات سابقة' : 'No submission history'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
