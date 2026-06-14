'use client';

import { useState } from 'react';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface Payment {
  id: string;
  invoiceNumber: string;
  customer: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
  reference: string;
  paidAt: string;
  notes?: string;
}

// Mock data
const mockPayments: Payment[] = [
  {
    id: '1',
    invoiceNumber: 'INV-20260614-001',
    customer: 'شركة النيل للتجارة',
    amount: 15750,
    method: 'bank_transfer',
    reference: 'TRX-2026-001',
    paidAt: '2026-06-14',
    notes: 'تحويل بنكي كامل المبلغ',
  },
  {
    id: '2',
    invoiceNumber: 'INV-20260614-002',
    customer: 'مؤسسة الأهرام',
    amount: 8200,
    method: 'cash',
    reference: 'CASH-2026-042',
    paidAt: '2026-06-14',
  },
  {
    id: '3',
    invoiceNumber: 'INV-20260613-003',
    customer: 'شركة السلام',
    amount: 23400,
    method: 'credit_card',
    reference: 'CC-2026-108',
    paidAt: '2026-06-13',
    notes: 'بطاقة ائتمان فيزا',
  },
  {
    id: '4',
    invoiceNumber: 'INV-20260613-004',
    customer: 'مصنع الحرية',
    amount: 5600,
    method: 'check',
    reference: 'CHK-2026-055',
    paidAt: '2026-06-12',
    notes: 'شيك بنك مصر - يستحق خلال 3 أيام',
  },
  {
    id: '5',
    invoiceNumber: 'INV-20260612-005',
    customer: 'شركة الوادي',
    amount: 12900,
    method: 'bank_transfer',
    reference: 'TRX-2026-089',
    paidAt: '2026-06-11',
  },
  {
    id: '6',
    invoiceNumber: 'INV-20260611-006',
    customer: 'مجموعة النور',
    amount: 42000,
    method: 'cash',
    reference: 'CASH-2026-038',
    paidAt: '2026-06-10',
    notes: 'دفعة نقدية من العميل',
  },
  {
    id: '7',
    invoiceNumber: 'INV-20260610-007',
    customer: 'شركة الفجر',
    amount: 18500,
    method: 'credit_card',
    reference: 'CC-2026-095',
    paidAt: '2026-06-09',
  },
];

// Mock invoices for select
const mockInvoices = [
  { id: 'inv-1', number: 'INV-20260614-001', customer: 'شركة النيل للتجارة', total: 15750 },
  { id: 'inv-2', number: 'INV-20260614-002', customer: 'مؤسسة الأهرام', total: 8200 },
  { id: 'inv-3', number: 'INV-20260613-003', customer: 'شركة السلام', total: 23400 },
  { id: 'inv-4', number: 'INV-20260613-004', customer: 'مصنع الحرية', total: 5600 },
  { id: 'inv-5', number: 'INV-20260612-005', customer: 'شركة الوادي', total: 12900 },
  { id: 'inv-6', number: 'INV-20260611-006', customer: 'مجموعة النور', total: 42000 },
];

const methodConfig: Record<
  Payment['method'],
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
  check: {
    labelAr: 'شيك',
    labelEn: 'Check',
    icon: FileText,
    colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG') + ' ج.م';
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

  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<Payment['method']>('cash');
  const [formReference, setFormReference] = useState('');
  const [formPaidAt, setFormPaidAt] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const resetForm = () => {
    setFormInvoiceId('');
    setFormAmount('');
    setFormMethod('cash');
    setFormReference('');
    setFormPaidAt('');
    setFormNotes('');
  };

  const handleCreatePayment = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const selectedInvoice = mockInvoices.find((inv) => inv.id === formInvoiceId);
      const newPayment: Payment = {
        id: String(Date.now()),
        invoiceNumber: selectedInvoice?.number || '',
        customer: selectedInvoice?.customer || '',
        amount: parseFloat(formAmount) || 0,
        method: formMethod,
        reference: formReference,
        paidAt: formPaidAt,
        notes: formNotes || undefined,
      };
      setPayments((prev) => [newPayment, ...prev]);
      setIsSubmitting(false);
      setDialogOpen(false);
      resetForm();
    }, 500);
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.customer.includes(searchQuery) ||
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const cashTotal = payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
  const bankTotal = payments
    .filter((p) => p.method === 'bank_transfer')
    .reduce((s, p) => s + p.amount, 0);
  const ccTotal = payments
    .filter((p) => p.method === 'credit_card')
    .reduce((s, p) => s + p.amount, 0);
  const checkTotal = payments
    .filter((p) => p.method === 'check')
    .reduce((s, p) => s + p.amount, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.payments}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'ar'
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
                    const inv = mockInvoices.find((i) => i.id === val);
                    if (inv) setFormAmount(String(inv.total));
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الفاتورة' : 'Select invoice'} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.number} - {inv.customer}
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
                  <Select value={formMethod} onValueChange={(val) => setFormMethod(val as Payment['method'])}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          {t.cash}
                        </span>
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {t.bankTransfer}
                        </span>
                      </SelectItem>
                      <SelectItem value="credit_card">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {t.creditCard}
                        </span>
                      </SelectItem>
                      <SelectItem value="check">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {t.check}
                        </span>
                      </SelectItem>
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

                {/* Payment Date */}
                <div className="grid gap-2">
                  <Label htmlFor="paidAt">{t.paidAt}</Label>
                  <Input
                    id="paidAt"
                    type="date"
                    value={formPaidAt}
                    onChange={(e) => setFormPaidAt(e.target.value)}
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
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={!formInvoiceId || !formAmount || !formPaidAt || isSubmitting}
                >
                  {isSubmitting
                    ? t.loading
                    : t.create}
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
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const method = methodConfig[payment.method];
                      const MethodIcon = method.icon;
                      return (
                        <TableRow key={payment.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-sm">
                            {payment.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-sm">{payment.customer}</TableCell>
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
                            {payment.reference}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(payment.paidAt, language)}
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
