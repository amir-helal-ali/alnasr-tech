'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type PaymentMethod, type CreatePaymentInput } from '@/lib/api';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CreditCard,
  Plus,
  Banknote,
  Building2,
  Wallet,
  FileText,
  Search,
  MoreHorizontal,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Method configuration with Arabic/English labels
const methodConfig: Record<
  PaymentMethod,
  { labelAr: string; labelEn: string; icon: React.ElementType; colorClass: string }
> = {
  cash: {
    labelAr: 'نقدي',
    labelEn: 'Cash',
    icon: Banknote,
    colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  bank_transfer: {
    labelAr: 'تحويل بنكي',
    labelEn: 'Bank Transfer',
    icon: Building2,
    colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  credit_card: {
    labelAr: 'بطاقة ائتمان',
    labelEn: 'Credit Card',
    icon: CreditCard,
    colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  debit_card: {
    labelAr: 'بطاقة خصم',
    labelEn: 'Debit Card',
    icon: Wallet,
    colorClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  check: {
    labelAr: 'شيك',
    labelEn: 'Check',
    icon: FileText,
    colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  other: {
    labelAr: 'أخرى',
    labelEn: 'Other',
    icon: CreditCard,
    colorClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
};

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('ar-EG') + ' ج.م';
}

function formatDate(dateStr: string, lang: 'ar' | 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PaymentsPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('cash');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const resetForm = () => {
    setFormInvoiceId('');
    setFormAmount('');
    setFormMethod('cash');
    setFormReference('');
    setFormNotes('');
  };

  // ---- Queries ----
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['payments', page],
    queryFn: () => api.getPayments({ page, per_page: 50 }),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-for-payments'],
    queryFn: () => api.getInvoices({ per_page: 100 }),
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentInput) => api.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const handleCreatePayment = () => {
    createMutation.mutate({
      invoice_id: formInvoiceId,
      amount: formAmount,
      method: formMethod,
      reference: formReference || undefined,
      notes: formNotes || undefined,
    });
  };

  // ---- Derived data ----
  const payments = paymentsData?.payments ?? [];
  const invoices = invoicesData?.invoices ?? [];

  // Build a lookup map for invoices by id
  const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

  // Client-side search filtering
  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const inv = invoiceMap.get(p.invoice_id);
    const invoiceNumber = inv?.invoice_number ?? p.invoice_id;
    const customerName = inv?.customer?.name ?? '';
    return (
      invoiceNumber.toLowerCase().includes(q) ||
      customerName.includes(searchQuery) ||
      (p.reference ?? '').toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const cashTotal = payments.filter((p) => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount), 0);
  const bankTotal = payments.filter((p) => p.method === 'bank_transfer').reduce((s, p) => s + parseFloat(p.amount), 0);
  const ccTotal = payments.filter((p) => p.method === 'credit_card').reduce((s, p) => s + parseFloat(p.amount), 0);
  const checkTotal = payments.filter((p) => p.method === 'check').reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.payments}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {paymentsLoading
                ? t.loading
                : language === 'ar'
                  ? `إجمالي ${payments.length} دفعة بمبلغ ${formatCurrency(totalAmount)}`
                  : `${payments.length} payments totaling ${formatCurrency(totalAmount)}`}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t.recordPayment}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{t.recordPayment}</DialogTitle>
                <DialogDescription>
                  {language === 'ar'
                    ? 'أدخل بيانات الدفعة الجديدة'
                    : 'Enter the new payment details'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Invoice Select */}
                <div className="grid gap-2">
                  <Label htmlFor="invoice">{t.invoiceNumber}</Label>
                  <Select value={formInvoiceId} onValueChange={(val) => {
                    setFormInvoiceId(val);
                    const inv = invoices.find((i) => i.id === val);
                    if (inv) setFormAmount(inv.total);
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الفاتورة' : 'Select invoice'} />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} - {inv.customer?.name ?? inv.customer_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="grid gap-2">
                  <Label htmlFor="amount">{t.amount}</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل المبلغ' : 'Enter amount'}
                  />
                </div>

                {/* Payment Method */}
                <div className="grid gap-2">
                  <Label>{t.paymentMethod}</Label>
                  <Select value={formMethod} onValueChange={(val) => setFormMethod(val as PaymentMethod)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(methodConfig) as PaymentMethod[]).map((method) => {
                        const cfg = methodConfig[method];
                        const Icon = cfg.icon;
                        return (
                          <SelectItem key={method} value={method}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reference */}
                <div className="grid gap-2">
                  <Label htmlFor="reference">{t.reference}</Label>
                  <Input
                    id="reference"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    placeholder={language === 'ar' ? 'رقم المرجع' : 'Reference number'}
                  />
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="notes">{t.notes}</Label>
                  <Textarea
                    id="notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'ملاحظات إضافية' : 'Additional notes'}
                    rows={3}
                  />
                </div>
              </div>
              {createMutation.error && (
                <div className="flex items-center gap-2 text-sm text-destructive mb-2 px-1">
                  <AlertCircle className="h-4 w-4" />
                  {createMutation.error.message}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={!formInvoiceId || !formAmount || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.loading}
                    </span>
                  ) : t.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                  <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.cash}</p>
                  <p className="text-sm font-bold">{formatCurrency(cashTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.bankTransfer}</p>
                  <p className="text-sm font-bold">{formatCurrency(bankTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                  <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.creditCard}</p>
                  <p className="text-sm font-bold">{formatCurrency(ccTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.check}</p>
                  <p className="text-sm font-bold">{formatCurrency(checkTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="pr-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t.invoiceNumber}</TableHead>
                    <TableHead className="text-right">{t.customer}</TableHead>
                    <TableHead className="text-right">{t.amount}</TableHead>
                    <TableHead className="text-right">{t.paymentMethod}</TableHead>
                    <TableHead className="text-right">{t.reference}</TableHead>
                    <TableHead className="text-right">{t.paidAt}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        {t.loading}
                      </TableCell>
                    </TableRow>
                  ) : paymentsError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-destructive">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                        {paymentsError.message}
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const method = methodConfig[payment.method];
                      const MethodIcon = method.icon;
                      const inv = invoiceMap.get(payment.invoice_id);
                      return (
                        <TableRow key={payment.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-sm">
                            {inv?.invoice_number ?? payment.invoice_id}
                          </TableCell>
                          <TableCell className="text-sm">
                            {inv?.customer?.name ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`gap-1.5 ${method.colorClass} border-0 font-medium`}
                            >
                              <MethodIcon className="h-3.5 w-3.5" />
                              {language === 'ar' ? method.labelAr : method.labelEn}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {payment.reference ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(payment.paid_at, language)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu dir={language === 'ar' ? 'rtl' : 'ltr'}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                                <DropdownMenuItem className="gap-2">
                                  <Eye className="h-4 w-4" />
                                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
