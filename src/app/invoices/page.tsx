'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  Calculator,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'issued' | 'submitted' | 'accepted' | 'paid' | 'cancelled';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  notes: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EGYPT_VAT = 14;

function calcLineTaxAmount(item: LineItem): number {
  return item.quantity * item.unitPrice * (item.taxRate / 100);
}

function calcLineTotal(item: LineItem): number {
  return item.quantity * item.unitPrice + calcLineTaxAmount(item);
}

function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

function calcTaxTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + calcLineTaxAmount(i), 0);
}

function calcGrandTotal(items: LineItem[]): number {
  return calcSubtotal(items) + calcTaxTotal(items);
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ج.م';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function uid(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── Status Config ───────────────────────────────────────────────────────────

interface StatusConfig {
  labelAr: string;
  labelEn: string;
  className: string;
}

const statusConfig: Record<InvoiceStatus, StatusConfig> = {
  draft: {
    labelAr: 'مسودة',
    labelEn: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  issued: {
    labelAr: 'صادرة',
    labelEn: 'Issued',
    className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900 dark:text-sky-300 dark:border-sky-800',
  },
  submitted: {
    labelAr: 'مُقدمة',
    labelEn: 'Submitted',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800',
  },
  accepted: {
    labelAr: 'مقبولة',
    labelEn: 'Accepted',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800',
  },
  paid: {
    labelAr: 'مدفوعة',
    labelEn: 'Paid',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800',
  },
  cancelled: {
    labelAr: 'ملغاة',
    labelEn: 'Cancelled',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800',
  },
};

// ─── Mock Customers ──────────────────────────────────────────────────────────

const mockCustomers = [
  { id: 'c1', name: 'شركة النيل للتجارة' },
  { id: 'c2', name: 'مؤسسة الأهرام' },
  { id: 'c3', name: 'شركة السلام' },
  { id: 'c4', name: 'مصنع الحرية' },
  { id: 'c5', name: 'شركة الوادي' },
  { id: 'c6', name: 'مجموعة الفتح' },
];

// ─── Mock Invoices ───────────────────────────────────────────────────────────

const initialInvoices: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'c1',
    customerName: 'شركة النيل للتجارة',
    status: 'paid',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    lineItems: [
      { id: 'l1', description: 'أجهزة حاسب آلي', quantity: 5, unitPrice: 15000, taxRate: 14 },
      { id: 'l2', description: 'طابعات ليزر', quantity: 3, unitPrice: 4500, taxRate: 14 },
    ],
    notes: 'تم الدفع عبر تحويل بنكي',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2026-0002',
    customerId: 'c2',
    customerName: 'مؤسسة الأهرام',
    status: 'issued',
    issueDate: '2026-02-01',
    dueDate: '2026-03-01',
    lineItems: [
      { id: 'l3', description: 'خدمات استشارية', quantity: 1, unitPrice: 25000, taxRate: 14 },
    ],
    notes: '',
    createdAt: '2026-02-01T09:30:00Z',
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2026-0003',
    customerId: 'c3',
    customerName: 'شركة السلام',
    status: 'draft',
    issueDate: '2026-02-20',
    dueDate: '2026-03-20',
    lineItems: [
      { id: 'l4', description: 'شاشات عرض', quantity: 10, unitPrice: 3200, taxRate: 14 },
      { id: 'l5', description: 'كابلات توصيل', quantity: 20, unitPrice: 150, taxRate: 14 },
      { id: 'l6', description: 'حوامل شاشات', quantity: 10, unitPrice: 800, taxRate: 14 },
    ],
    notes: 'بانتظار تأكيد العميل',
    createdAt: '2026-02-20T14:00:00Z',
  },
  {
    id: 'inv4',
    invoiceNumber: 'INV-2026-0004',
    customerId: 'c4',
    customerName: 'مصنع الحرية',
    status: 'submitted',
    issueDate: '2026-03-05',
    dueDate: '2026-04-05',
    lineItems: [
      { id: 'l7', description: 'صيانة دورية', quantity: 1, unitPrice: 8500, taxRate: 14 },
      { id: 'l8', description: 'قطع غيار', quantity: 4, unitPrice: 1200, taxRate: 14 },
    ],
    notes: 'تم التقديم لهيئة الضرائب',
    createdAt: '2026-03-05T11:00:00Z',
  },
  {
    id: 'inv5',
    invoiceNumber: 'INV-2026-0005',
    customerId: 'c5',
    customerName: 'شركة الوادي',
    status: 'accepted',
    issueDate: '2026-03-10',
    dueDate: '2026-04-10',
    lineItems: [
      { id: 'l9', description: 'برمجة تطبيق مخصص', quantity: 1, unitPrice: 75000, taxRate: 14 },
    ],
    notes: 'مقبولة من هيئة الضرائب',
    createdAt: '2026-03-10T16:00:00Z',
  },
  {
    id: 'inv6',
    invoiceNumber: 'INV-2026-0006',
    customerId: 'c6',
    customerName: 'مجموعة الفتح',
    status: 'cancelled',
    issueDate: '2026-01-20',
    dueDate: '2026-02-20',
    lineItems: [
      { id: 'l10', description: 'أثاث مكتبي', quantity: 8, unitPrice: 3500, taxRate: 14 },
    ],
    notes: 'تم الإلغاء بناءً على طلب العميل',
    createdAt: '2026-01-20T08:00:00Z',
  },
  {
    id: 'inv7',
    invoiceNumber: 'INV-2026-0007',
    customerId: 'c1',
    customerName: 'شركة النيل للتجارة',
    status: 'paid',
    issueDate: '2026-03-25',
    dueDate: '2026-04-25',
    lineItems: [
      { id: 'l11', description: 'سيرفرات', quantity: 2, unitPrice: 45000, taxRate: 14 },
      { id: 'l12', description: 'تركيب وتجهيز', quantity: 1, unitPrice: 12000, taxRate: 14 },
    ],
    notes: '',
    createdAt: '2026-03-25T13:00:00Z',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const isAr = language === 'ar';

  // State
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLineItems, setFormLineItems] = useState<LineItem[]>([]);

  // ─── Filtered invoices ──────────────────────────────────────────────────

  const filteredInvoices = useMemo(() => {
    if (activeTab === 'all') return invoices;
    return invoices.filter((inv) => inv.status === activeTab);
  }, [invoices, activeTab]);

  // ─── Tab counts ─────────────────────────────────────────────────────────

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    for (const inv of invoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return counts;
  }, [invoices]);

  // ─── Reset form ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormCustomerId('');
    setFormIssueDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormNotes('');
    setFormLineItems([
      { id: uid(), description: '', quantity: 1, unitPrice: 0, taxRate: EGYPT_VAT },
    ]);
    setEditingInvoice(null);
  }, []);

  // ─── Open create ────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  // ─── Open edit ──────────────────────────────────────────────────────────

  const openEdit = useCallback((invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormCustomerId(invoice.customerId);
    setFormIssueDate(invoice.issueDate);
    setFormDueDate(invoice.dueDate);
    setFormNotes(invoice.notes);
    setFormLineItems(
      invoice.lineItems.map((li) => ({ ...li, id: uid() }))
    );
    setFormOpen(true);
  }, []);

  // ─── Open detail ────────────────────────────────────────────────────────

  const openDetail = useCallback((invoice: Invoice) => {
    setViewingInvoice(invoice);
    setDetailOpen(true);
  }, []);

  // ─── Open delete ────────────────────────────────────────────────────────

  const openDelete = useCallback((invoice: Invoice) => {
    setDeletingInvoice(invoice);
    setDeleteOpen(true);
  }, []);

  // ─── Line item helpers ──────────────────────────────────────────────────

  const addLineItem = useCallback(() => {
    setFormLineItems((prev) => [
      ...prev,
      { id: uid(), description: '', quantity: 1, unitPrice: 0, taxRate: EGYPT_VAT },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setFormLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((li) => li.id !== id);
    });
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setFormLineItems((prev) =>
        prev.map((li) => (li.id === id ? { ...li, [field]: value } : li))
      );
    },
    []
  );

  // ─── Save invoice ───────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    // Validate
    if (!formCustomerId) {
      toast.error(isAr ? 'يرجى اختيار العميل' : 'Please select a customer');
      return;
    }
    if (!formIssueDate) {
      toast.error(isAr ? 'يرجى إدخال تاريخ الإصدار' : 'Please enter issue date');
      return;
    }
    if (!formDueDate) {
      toast.error(isAr ? 'يرجى إدخال تاريخ الاستحقاق' : 'Please enter due date');
      return;
    }
    const hasEmptyDesc = formLineItems.some((li) => !li.description.trim());
    if (hasEmptyDesc) {
      toast.error(isAr ? 'يرجى إدخال وصف لجميع البنود' : 'Please enter description for all items');
      return;
    }
    const hasZeroPrice = formLineItems.some((li) => li.unitPrice <= 0);
    if (hasZeroPrice) {
      toast.error(isAr ? 'يرجى إدخال سعر وحدة صحيح' : 'Please enter valid unit price');
      return;
    }

    const customer = mockCustomers.find((c) => c.id === formCustomerId);
    const customerName = customer?.name || '';

    if (editingInvoice) {
      // Update
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === editingInvoice.id
            ? {
                ...inv,
                customerId: formCustomerId,
                customerName,
                issueDate: formIssueDate,
                dueDate: formDueDate,
                notes: formNotes,
                lineItems: formLineItems.map((li) => ({ ...li })),
              }
            : inv
        )
      );
      toast.success(isAr ? 'تم تحديث الفاتورة بنجاح' : 'Invoice updated successfully');
    } else {
      // Create
      const nextNum = invoices.length + 1;
      const newInvoice: Invoice = {
        id: uid(),
        invoiceNumber: `INV-2026-${String(nextNum).padStart(4, '0')}`,
        customerId: formCustomerId,
        customerName,
        status: 'draft',
        issueDate: formIssueDate,
        dueDate: formDueDate,
        notes: formNotes,
        lineItems: formLineItems.map((li) => ({ ...li })),
        createdAt: new Date().toISOString(),
      };
      setInvoices((prev) => [newInvoice, ...prev]);
      toast.success(isAr ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
    }

    setFormOpen(false);
    resetForm();
  }, [formCustomerId, formIssueDate, formDueDate, formNotes, formLineItems, editingInvoice, invoices, isAr, resetForm]);

  // ─── Delete invoice ─────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!deletingInvoice) return;
    setInvoices((prev) => prev.filter((inv) => inv.id !== deletingInvoice.id));
    setDeleteOpen(false);
    setDeletingInvoice(null);
    toast.success(isAr ? 'تم حذف الفاتورة بنجاح' : 'Invoice deleted successfully');
  }, [deletingInvoice, isAr]);



  // ─── Computed form totals ───────────────────────────────────────────────

  const formSubtotal = useMemo(() => calcSubtotal(formLineItems), [formLineItems]);
  const formTaxTotal = useMemo(() => calcTaxTotal(formLineItems), [formLineItems]);
  const formGrandTotal = useMemo(() => calcGrandTotal(formLineItems), [formLineItems]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t.invoices}</h1>
              <p className="text-sm text-muted-foreground">
                {isAr ? 'إدارة الفواتير والضرائب' : 'Invoice & Tax Management'}
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.newInvoice}
          </Button>
        </div>

        {/* ── Status Filter Tabs ──────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              {isAr ? 'الكل' : 'All'}
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-background px-1.5 text-[10px] font-medium">
                {tabCounts.all || 0}
              </span>
            </TabsTrigger>
            {(['draft', 'issued', 'submitted', 'accepted', 'paid', 'cancelled'] as InvoiceStatus[]).map(
              (status) => (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  {isAr ? statusConfig[status].labelAr : statusConfig[status].labelEn}
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-background px-1.5 text-[10px] font-medium">
                    {tabCounts[status] || 0}
                  </span>
                </TabsTrigger>
              )
            )}
          </TabsList>
        </Tabs>

        {/* ── Data Table ──────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t.invoiceNumber}</TableHead>
                    <TableHead className="text-center">{t.customer}</TableHead>
                    <TableHead className="text-center hidden md:table-cell">{t.issueDate}</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">{t.dueDate}</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">{t.subtotal}</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">{t.tax}</TableHead>
                    <TableHead className="text-center">{t.total}</TableHead>
                    <TableHead className="text-center">{t.status}</TableHead>
                    <TableHead className="text-center">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground/50" />
                          <p>{t.noData}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const subtotal = calcSubtotal(invoice.lineItems);
                      const taxTotal = calcTaxTotal(invoice.lineItems);
                      const grandTotal = calcGrandTotal(invoice.lineItems);
                      return (
                        <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-sm font-medium text-center">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {invoice.customerName}
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell text-sm text-muted-foreground">
                            {formatDate(invoice.issueDate)}
                          </TableCell>
                          <TableCell className="text-center hidden lg:table-cell text-sm text-muted-foreground">
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell text-sm">
                            {formatCurrency(subtotal)}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell text-sm">
                            {formatCurrency(taxTotal)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatCurrency(grandTotal)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={statusConfig[invoice.status].className}>
                              {isAr ? statusConfig[invoice.status].labelAr : statusConfig[invoice.status].labelEn}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openDetail(invoice)}
                                title={isAr ? 'عرض' : 'View'}
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(invoice)}
                                title={isAr ? 'تعديل' : 'Edit'}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openDelete(invoice)}
                                title={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Summary Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي المجموع الفرعي' : 'Total Subtotal'}</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    invoices.reduce((s, inv) => s + calcSubtotal(inv.lineItems), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الضريبة (١٤٪)' : 'Total Tax (14%)'}</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    invoices.reduce((s, inv) => s + calcTaxTotal(inv.lineItems), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'الإجمالي الكلي' : 'Grand Total'}</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    invoices.reduce((s, inv) => s + calcGrandTotal(inv.lineItems), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Create / Edit Dialog ────────────────────────────────────── */}
        <Dialog open={formOpen} onOpenChange={(open) => {
          if (!open) { resetForm(); }
          setFormOpen(open);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {editingInvoice ? t.editInvoice : t.newInvoice}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.customer}</Label>
                  <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isAr ? 'اختر العميل' : 'Select customer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.issueDate}</Label>
                  <Input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.dueDate}</Label>
                  <Input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{t.lineItems}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {isAr ? 'إضافة بند' : 'Add Item'}
                  </Button>
                </div>

                <ScrollArea className="w-full">
                  <div className="min-w-[600px]">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_80px_100px_80px_90px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-1 pb-2">
                      <span>{t.description}</span>
                      <span className="text-center">{t.quantity}</span>
                      <span className="text-center">{t.unitPrice}</span>
                      <span className="text-center">{t.taxRate}</span>
                      <span className="text-center">{isAr ? 'ضريبة' : 'Tax Amt'}</span>
                      <span className="text-center">{isAr ? 'الإجمالي' : 'Total'}</span>
                      <span></span>
                    </div>

                    {formLineItems.map((item, idx) => {
                      const lineTax = calcLineTaxAmount(item);
                      const lineTotal = calcLineTotal(item);
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_80px_100px_80px_90px_90px_32px] gap-2 items-center pb-2"
                        >
                          <Input
                            placeholder={isAr ? 'وصف البند' : 'Item description'}
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            className="h-9 text-sm"
                          />
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, 'quantity', Number(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-center"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) =>
                              updateLineItem(item.id, 'unitPrice', Number(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-center"
                            placeholder="0.00"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateLineItem(item.id, 'taxRate', Number(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-center"
                          />
                          <div className="h-9 flex items-center justify-center rounded-md bg-muted/60 text-sm font-medium px-2">
                            {formatCurrency(lineTax)}
                          </div>
                          <div className="h-9 flex items-center justify-center rounded-md bg-primary/10 text-sm font-semibold px-2">
                            {formatCurrency(lineTotal)}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeLineItem(item.id)}
                            disabled={formLineItems.length <= 1}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Totals */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="w-full sm:w-72 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.subtotal}</span>
                    <span className="font-medium">{formatCurrency(formSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.tax} ({EGYPT_VAT}%)
                    </span>
                    <span className="font-medium">{formatCurrency(formTaxTotal)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-base font-bold">
                    <span>{t.total}</span>
                    <span className="text-primary">{formatCurrency(formGrandTotal)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t.notes}</Label>
                <Textarea
                  placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
                {t.cancel}
              </Button>
              <Button onClick={handleSave}>
                {editingInvoice ? t.save : t.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Detail View Dialog ──────────────────────────────────────── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                {isAr ? 'تفاصيل الفاتورة' : 'Invoice Details'}
              </DialogTitle>
            </DialogHeader>

            {viewingInvoice && (
              <div className="space-y-6">
                {/* Invoice header info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.invoiceNumber}</p>
                    <p className="font-mono font-semibold">{viewingInvoice.invoiceNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.status}</p>
                    <Badge variant="outline" className={statusConfig[viewingInvoice.status].className}>
                      {isAr ? statusConfig[viewingInvoice.status].labelAr : statusConfig[viewingInvoice.status].labelEn}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.customer}</p>
                    <p className="font-medium">{viewingInvoice.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{isAr ? 'الرقم الضريبي' : 'Tax Number'}</p>
                    <p className="font-mono text-sm">300-000-0000</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.issueDate}</p>
                    <p className="text-sm">{formatDate(viewingInvoice.issueDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.dueDate}</p>
                    <p className="text-sm">{formatDate(viewingInvoice.dueDate)}</p>
                  </div>
                </div>

                <Separator />

                {/* Line items */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t.lineItems}</p>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">#</TableHead>
                          <TableHead>{t.description}</TableHead>
                          <TableHead className="text-center">{t.quantity}</TableHead>
                          <TableHead className="text-center">{t.unitPrice}</TableHead>
                          <TableHead className="text-center">{t.taxRate}</TableHead>
                          <TableHead className="text-center">{isAr ? 'الضريبة' : 'Tax'}</TableHead>
                          <TableHead className="text-center">{t.total}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingInvoice.lineItems.map((li, idx) => (
                          <TableRow key={li.id}>
                            <TableCell className="text-center text-muted-foreground text-sm">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-medium">{li.description}</TableCell>
                            <TableCell className="text-center">{li.quantity}</TableCell>
                            <TableCell className="text-center">{formatCurrency(li.unitPrice)}</TableCell>
                            <TableCell className="text-center">{li.taxRate}%</TableCell>
                            <TableCell className="text-center">{formatCurrency(calcLineTaxAmount(li))}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatCurrency(calcLineTotal(li))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.subtotal}</span>
                      <span className="font-medium">
                        {formatCurrency(calcSubtotal(viewingInvoice.lineItems))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t.tax} ({EGYPT_VAT}%)
                      </span>
                      <span className="font-medium">
                        {formatCurrency(calcTaxTotal(viewingInvoice.lineItems))}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-base font-bold">
                      <span>{t.total}</span>
                      <span className="text-primary">
                        {formatCurrency(calcGrandTotal(viewingInvoice.lineItems))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewingInvoice.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t.notes}</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-3">{viewingInvoice.notes}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md" dir={isAr ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                {isAr ? 'حذف الفاتورة' : 'Delete Invoice'}
              </DialogTitle>
              <DialogDescription>
                {t.areYouSure}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                {deletingInvoice && (
                  <>
                    {isAr ? 'سيتم حذف الفاتورة' : 'You are about to delete invoice'}{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {deletingInvoice.invoiceNumber}
                    </span>{' '}
                    {isAr ? 'للعميل' : 'for customer'}{' '}
                    <span className="font-semibold text-foreground">
                      {deletingInvoice.customerName}
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-destructive mt-2">{t.thisActionCannot}</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                {t.cancel}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
