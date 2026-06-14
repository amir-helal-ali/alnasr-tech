'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import {
  api,
  Invoice,
  InvoiceStatus,
  InvoiceListResponse,
  CustomerListResponse,
  CreateInvoiceInput,
  CreateInvoiceItemInput,
} from '@/lib/api';
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
  Trash2,
  Eye,
  FileText,
  Calculator,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const EGYPT_VAT = '14';
const ITEMS_PER_PAGE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00 ج.م';
  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ج.م';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function uid(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── Form line item (local state) ────────────────────────────────────────────

interface FormLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
}

function calcLineTaxAmount(item: FormLineItem): number {
  return item.quantity * parseFloat(item.unit_price || '0') * (parseFloat(item.tax_rate || '0') / 100);
}

function calcLineTotal(item: FormLineItem): number {
  return item.quantity * parseFloat(item.unit_price || '0') + calcLineTaxAmount(item);
}

function calcSubtotal(items: FormLineItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * parseFloat(i.unit_price || '0'), 0);
}

function calcTaxTotal(items: FormLineItem[]): number {
  return items.reduce((sum, i) => sum + calcLineTaxAmount(i), 0);
}

function calcGrandTotal(items: FormLineItem[]): number {
  return calcSubtotal(items) + calcTaxTotal(items);
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
  overdue: {
    labelAr: 'متأخرة',
    labelEn: 'Overdue',
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-800',
  },
};

// Valid status transitions
const nextStatusMap: Record<string, InvoiceStatus[]> = {
  draft: ['issued'],
  issued: ['submitted'],
  submitted: ['accepted'],
  accepted: ['paid'],
  paid: [],
  cancelled: [],
  overdue: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const isAr = language === 'ar';
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLineItems, setFormLineItems] = useState<FormLineItem[]>([]);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: invoicesData, isLoading, isError, error } = useQuery<InvoiceListResponse>({
    queryKey: ['invoices', currentPage, ITEMS_PER_PAGE, activeTab === 'all' ? undefined : activeTab],
    queryFn: () =>
      api.getInvoices({
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
        status: activeTab === 'all' ? undefined : activeTab,
      }),
  });

  const invoices = invoicesData?.invoices ?? [];
  const totalCount = invoicesData?.total ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Customers for dropdown
  const { data: customersData } = useQuery<CustomerListResponse>({
    queryKey: ['customers-list'],
    queryFn: () => api.getCustomers({ per_page: 100 }),
  });

  const customersList = customersData?.customers ?? [];

  // Detail invoice query
  const { data: detailInvoice, isLoading: isDetailLoading } = useQuery<Invoice>({
    queryKey: ['invoice', viewingInvoiceId],
    queryFn: () => api.getInvoice(viewingInvoiceId!),
    enabled: !!viewingInvoiceId,
  });

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (input: CreateInvoiceInput) => api.createInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(isAr ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
      setFormOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || (isAr ? 'فشل إنشاء الفاتورة' : 'Failed to create invoice'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success(isAr ? 'تم تحديث حالة الفاتورة' : 'Invoice status updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || (isAr ? 'فشل تحديث الحالة' : 'Failed to update status'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(isAr ? 'تم حذف الفاتورة بنجاح' : 'Invoice deleted successfully');
      setDeleteOpen(false);
      setDeletingInvoice(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || (isAr ? 'فشل حذف الفاتورة' : 'Failed to delete invoice'));
    },
  });

  // ─── Tab counts (from current page data) ────────────────────────────────

  // We use totalCount for "all" and approximate counts for tabs
  // For a more accurate count, we'd need a separate API call
  // For now, we compute from the loaded data
  const allInvoicesForCounts = invoicesData?.invoices ?? [];
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: totalCount };
    // Note: the backend returns filtered results, so tab counts for non-active tabs
    // are approximations. In production, the backend should provide counts.
    return counts;
  }, [totalCount]);

  // ─── Reset form ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormCustomerId('');
    setFormDueDate('');
    setFormNotes('');
    setFormLineItems([
      { id: uid(), description: '', quantity: 1, unit_price: '0', tax_rate: EGYPT_VAT },
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
    setFormCustomerId(invoice.customer_id);
    setFormDueDate(invoice.due_date || '');
    setFormNotes(invoice.notes || '');
    setFormLineItems(
      (invoice.items || []).map((li) => ({
        id: uid(),
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        tax_rate: li.tax_rate,
      }))
    );
    // If no items loaded (list view doesn't include items), add one empty item
    if (!invoice.items || invoice.items.length === 0) {
      setFormLineItems([
        { id: uid(), description: '', quantity: 1, unit_price: '0', tax_rate: EGYPT_VAT },
      ]);
    }
    setFormOpen(true);
  }, []);

  // ─── Open detail ────────────────────────────────────────────────────────

  const openDetail = useCallback((invoice: Invoice) => {
    setViewingInvoiceId(invoice.id);
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
      { id: uid(), description: '', quantity: 1, unit_price: '0', tax_rate: EGYPT_VAT },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setFormLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((li) => li.id !== id);
    });
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof FormLineItem, value: string | number) => {
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
    if (!formDueDate) {
      toast.error(isAr ? 'يرجى إدخال تاريخ الاستحقاق' : 'Please enter due date');
      return;
    }
    const hasEmptyDesc = formLineItems.some((li) => !li.description.trim());
    if (hasEmptyDesc) {
      toast.error(isAr ? 'يرجى إدخال وصف لجميع البنود' : 'Please enter description for all items');
      return;
    }
    const hasZeroPrice = formLineItems.some((li) => parseFloat(li.unit_price || '0') <= 0);
    if (hasZeroPrice) {
      toast.error(isAr ? 'يرجى إدخال سعر وحدة صحيح' : 'Please enter valid unit price');
      return;
    }

    const items: CreateInvoiceItemInput[] = formLineItems.map((li) => ({
      description: li.description.trim(),
      quantity: li.quantity,
      unit_price: li.unit_price,
      tax_rate: li.tax_rate || undefined,
    }));

    const payload: CreateInvoiceInput = {
      customer_id: formCustomerId,
      items,
      due_date: formDueDate,
      notes: formNotes.trim() || undefined,
    };

    createMutation.mutate(payload);
  }, [formCustomerId, formDueDate, formNotes, formLineItems, isAr, createMutation]);

  // ─── Delete invoice ─────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!deletingInvoice) return;
    deleteMutation.mutate(deletingInvoice.id);
  }, [deletingInvoice, deleteMutation]);

  // ─── Handle status change ───────────────────────────────────────────────

  const handleStatusChange = useCallback(
    (invoiceId: string, newStatus: InvoiceStatus) => {
      updateStatusMutation.mutate({ id: invoiceId, status: newStatus });
    },
    [updateStatusMutation]
  );

  // ─── Computed form totals ───────────────────────────────────────────────

  const formSubtotal = useMemo(() => calcSubtotal(formLineItems), [formLineItems]);
  const formTaxTotal = useMemo(() => calcTaxTotal(formLineItems), [formLineItems]);
  const formGrandTotal = useMemo(() => calcGrandTotal(formLineItems), [formLineItems]);

  // ─── Page numbers ──────────────────────────────────────────────────────

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  // ─── Customer name lookup ───────────────────────────────────────────────

  function getCustomerName(customerId: string): string {
    const customer = customersList.find((c) => c.id === customerId);
    return customer?.name || customerId;
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const isSaving = createMutation.isPending;
  const isDeleting = deleteMutation.isPending;

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
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setCurrentPage(1);
          }}
        >
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              {isAr ? 'الكل' : 'All'}
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-background px-1.5 text-[10px] font-medium">
                {totalCount}
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
                </TabsTrigger>
              )
            )}
          </TabsList>
        </Tabs>

        {/* ── Data Table ──────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              // Loading state
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">{t.invoiceNumber}</TableHead>
                      <TableHead className="text-center">{t.customer}</TableHead>
                      <TableHead className="text-center hidden md:table-cell">{t.dueDate}</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">{t.subtotal}</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">{t.tax}</TableHead>
                      <TableHead className="text-center">{t.total}</TableHead>
                      <TableHead className="text-center">{t.status}</TableHead>
                      <TableHead className="text-center">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                        <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><div className="h-4 w-20 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><div className="h-4 w-16 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                        <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full mx-auto" /></TableCell>
                        <TableCell><div className="flex gap-1 justify-center"><div className="h-8 w-8 bg-muted animate-pulse rounded" /><div className="h-8 w-8 bg-muted animate-pulse rounded" /></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : isError ? (
              // Error state
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {isAr ? 'خطأ في التحميل' : 'Error Loading Data'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {error?.message || (isAr ? 'حدث خطأ أثناء تحميل البيانات' : 'An error occurred while loading data')}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
                >
                  {isAr ? 'إعادة المحاولة' : 'Retry'}
                </Button>
              </div>
            ) : invoices.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {activeTab !== 'all'
                    ? isAr ? 'لا توجد فواتير بهذه الحالة' : 'No invoices with this status'
                    : t.noData}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {isAr
                    ? 'لم يتم إضافة أي فواتير بعد. اضغط على "فاتورة جديدة" لإنشاء أول فاتورة.'
                    : 'No invoices have been added yet. Click "New Invoice" to create your first invoice.'}
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">{t.invoiceNumber}</TableHead>
                        <TableHead className="text-center">{t.customer}</TableHead>
                        <TableHead className="text-center hidden md:table-cell">{t.dueDate}</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">{t.subtotal}</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">{t.tax}</TableHead>
                        <TableHead className="text-center">{t.total}</TableHead>
                        <TableHead className="text-center">{t.status}</TableHead>
                        <TableHead className="text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const customerName = invoice.customer?.name || getCustomerName(invoice.customer_id);
                        const nextStatuses = nextStatusMap[invoice.status] || [];
                        return (
                          <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-sm font-medium text-center">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {customerName}
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell text-sm text-muted-foreground">
                              {formatDate(invoice.due_date)}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell text-sm">
                              {formatCurrency(invoice.subtotal)}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell text-sm">
                              {formatCurrency(invoice.tax_amount)}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatCurrency(invoice.total)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={statusConfig[invoice.status]?.className || ''}>
                                {isAr ? statusConfig[invoice.status]?.labelAr : statusConfig[invoice.status]?.labelEn}
                              </Badge>
                              {/* Next status buttons */}
                              {nextStatuses.length > 0 && (
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  {nextStatuses.map((ns) => (
                                    <Button
                                      key={ns}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px] gap-0.5"
                                      onClick={() => handleStatusChange(invoice.id, ns)}
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      <ChevronRight className="h-3 w-3" />
                                      {isAr ? statusConfig[ns].labelAr : statusConfig[ns].labelEn}
                                    </Button>
                                  ))}
                                </div>
                              )}
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
                                  onClick={() => openDelete(invoice)}
                                  title={isAr ? 'حذف' : 'Delete'}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {t.showing}{' '}
                      <span className="font-medium text-foreground">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>{' '}
                      -{' '}
                      <span className="font-medium text-foreground">
                        {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
                      </span>{' '}
                      {t.of}{' '}
                      <span className="font-medium text-foreground">
                        {totalCount}
                      </span>{' '}
                      {t.results}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        {t.previous}
                      </Button>
                      {pageNumbers.slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                      ).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        {t.next}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
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
                    invoices.reduce((s, inv) => s + parseFloat(inv.subtotal || '0'), 0)
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
                    invoices.reduce((s, inv) => s + parseFloat(inv.tax_amount || '0'), 0)
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
                    invoices.reduce((s, inv) => s + parseFloat(inv.total || '0'), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Create Dialog ───────────────────────────────────────────── */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.customer} <span className="text-destructive">*</span></Label>
                  <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isAr ? 'اختر العميل' : 'Select customer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {customersList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.dueDate} <span className="text-destructive">*</span></Label>
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

                    {formLineItems.map((item) => {
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
                              updateLineItem(item.id, 'quantity', Number(e.target.value) || 1)
                            }
                            className="h-9 text-sm text-center"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || ''}
                            onChange={(e) =>
                              updateLineItem(item.id, 'unit_price', e.target.value)
                            }
                            className="h-9 text-sm text-center"
                            placeholder="0.00"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.tax_rate}
                            onChange={(e) =>
                              updateLineItem(item.id, 'tax_rate', e.target.value)
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
              <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }} disabled={isSaving}>
                {t.cancel}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? t.loading : t.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Detail View Dialog ──────────────────────────────────────── */}
        <Dialog open={detailOpen} onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setViewingInvoiceId(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                {isAr ? 'تفاصيل الفاتورة' : 'Invoice Details'}
              </DialogTitle>
            </DialogHeader>

            {isDetailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : detailInvoice ? (
              <div className="space-y-6">
                {/* Invoice header info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.invoiceNumber}</p>
                    <p className="font-mono font-semibold">{detailInvoice.invoice_number}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.status}</p>
                    <Badge variant="outline" className={statusConfig[detailInvoice.status]?.className || ''}>
                      {isAr ? statusConfig[detailInvoice.status]?.labelAr : statusConfig[detailInvoice.status]?.labelEn}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.customer}</p>
                    <p className="font-medium">
                      {detailInvoice.customer?.name || getCustomerName(detailInvoice.customer_id)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.dueDate}</p>
                    <p className="text-sm">{formatDate(detailInvoice.due_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                    <p className="text-sm">{formatDate(detailInvoice.issue_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{isAr ? 'تاريخ الإنشاء' : 'Created At'}</p>
                    <p className="text-sm">{formatDate(detailInvoice.created_at)}</p>
                  </div>
                </div>

                {/* Status transition buttons */}
                {(nextStatusMap[detailInvoice.status] || []).length > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">
                        {isAr ? 'تغيير الحالة:' : 'Change status:'}
                      </span>
                      {nextStatusMap[detailInvoice.status].map((ns) => (
                        <Button
                          key={ns}
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleStatusChange(detailInvoice.id, ns)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                          {isAr ? statusConfig[ns].labelAr : statusConfig[ns].labelEn}
                        </Button>
                      ))}
                      {detailInvoice.status !== 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => handleStatusChange(detailInvoice.id, 'cancelled')}
                          disabled={updateStatusMutation.isPending}
                        >
                          {isAr ? statusConfig.cancelled.labelAr : statusConfig.cancelled.labelEn}
                        </Button>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Line items */}
                {detailInvoice.items && detailInvoice.items.length > 0 && (
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
                          {detailInvoice.items.map((li, idx) => (
                            <TableRow key={li.id}>
                              <TableCell className="text-center text-muted-foreground text-sm">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">{li.description}</TableCell>
                              <TableCell className="text-center">{li.quantity}</TableCell>
                              <TableCell className="text-center">{formatCurrency(li.unit_price)}</TableCell>
                              <TableCell className="text-center">{li.tax_rate}%</TableCell>
                              <TableCell className="text-center">{formatCurrency(li.tax_amount)}</TableCell>
                              <TableCell className="text-center font-semibold">
                                {formatCurrency(li.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.subtotal}</span>
                      <span className="font-medium">{formatCurrency(detailInvoice.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.tax}</span>
                      <span className="font-medium">{formatCurrency(detailInvoice.tax_amount)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-base font-bold">
                      <span>{t.total}</span>
                      <span className="text-primary">{formatCurrency(detailInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {detailInvoice.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t.notes}</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-3">{detailInvoice.notes}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t.noData}</p>
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
                      {deletingInvoice.invoice_number}
                    </span>{' '}
                    {isAr ? 'للعميل' : 'for customer'}{' '}
                    <span className="font-semibold text-foreground">
                      {deletingInvoice.customer?.name || getCustomerName(deletingInvoice.customer_id)}
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-destructive mt-2">{t.thisActionCannot}</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
                {t.cancel}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isDeleting ? t.loading : t.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
