'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import {
  api,
  Customer,
  CustomerListResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Plus, Edit, Trash2, Users, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ─── Form Data ────────────────────────────────────────────────────────────────

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
  notes: string;
}

const initialFormData: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  tax_id: '',
  notes: '',
};

const ITEMS_PER_PAGE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const isRtl = language === 'ar';
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  // ─── Queries & Mutations ─────────────────────────────────────────────────

  const { data, isLoading, isError, error } = useQuery<CustomerListResponse>({
    queryKey: ['customers', currentPage, ITEMS_PER_PAGE, searchQuery],
    queryFn: () =>
      api.getCustomers({
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
      }),
  });

  const customers = data?.customers ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const createMutation = useMutation({
    mutationFn: (input: CreateCustomerInput) => api.createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(isRtl ? 'تم إنشاء العميل بنجاح' : 'Customer created successfully');
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingCustomer(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || (isRtl ? 'فشل إنشاء العميل' : 'Failed to create customer'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      api.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(isRtl ? 'تم تحديث العميل بنجاح' : 'Customer updated successfully');
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingCustomer(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || (isRtl ? 'فشل تحديث العميل' : 'Failed to update customer'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(isRtl ? 'تم حذف العميل بنجاح' : 'Customer deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
      // Adjust page if needed
      const remaining = totalCount - 1;
      const maxPage = Math.ceil(remaining / ITEMS_PER_PAGE);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || (isRtl ? 'فشل حذف العميل' : 'Failed to delete customer'));
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleCreate() {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country || '',
      tax_id: customer.tax_id || '',
      notes: customer.notes || '',
    });
    setIsDialogOpen(true);
  }

  function handleDeleteClick(customer: Customer) {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error(isRtl ? 'اسم العميل مطلوب' : 'Customer name is required');
      return;
    }

    const payload: CreateCustomerInput = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      country: formData.country.trim() || undefined,
      tax_id: formData.tax_id.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleConfirmDelete() {
    if (!deletingCustomer) return;
    deleteMutation.mutate(deletingCustomer.id);
  }

  function updateField(field: keyof CustomerFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t.customers}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {isRtl
                  ? `${totalCount} عميل مسجل`
                  : `${totalCount} registered customers`}
              </p>
            </div>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.newCustomer}
          </Button>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
              <Input
                placeholder={
                  isRtl
                    ? 'ابحث بالاسم أو البريد الإلكتروني أو الهاتف...'
                    : 'Search by name, email, or phone...'
                }
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="ps-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {isRtl ? 'قائمة العملاء' : 'Customer List'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              // Loading State
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.name}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{t.email}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{t.phone}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{isRtl ? 'المدينة' : 'City'}</TableHead>
                    <TableHead className="text-start hidden xl:table-cell">{t.taxNumber}</TableHead>
                    <TableHead className="text-start">{t.status}</TableHead>
                    <TableHead className="text-start">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              // Error State
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {isRtl ? 'خطأ في التحميل' : 'Error Loading Data'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {error?.message || (isRtl ? 'حدث خطأ أثناء تحميل البيانات' : 'An error occurred while loading data')}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
                >
                  {isRtl ? 'إعادة المحاولة' : 'Retry'}
                </Button>
              </div>
            ) : customers.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {searchQuery
                    ? isRtl
                      ? 'لا توجد نتائج'
                      : 'No results found'
                    : t.noData}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery
                    ? isRtl
                      ? `لم يتم العثور على عملاء مطابقين لـ "${searchQuery}"`
                      : `No customers matching "${searchQuery}"`
                    : isRtl
                      ? 'لم يتم إضافة أي عملاء بعد. اضغط على "عميل جديد" لإضافة أول عميل.'
                      : 'No customers have been added yet. Click "New Customer" to add your first customer.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => handleSearchChange('')}
                  >
                    {isRtl ? 'مسح البحث' : 'Clear Search'}
                  </Button>
                )}
              </div>
            ) : (
              // Data Table
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">{t.name}</TableHead>
                        <TableHead className="text-start hidden md:table-cell">{t.email}</TableHead>
                        <TableHead className="text-start hidden lg:table-cell">{t.phone}</TableHead>
                        <TableHead className="text-start hidden lg:table-cell">{isRtl ? 'المدينة' : 'City'}</TableHead>
                        <TableHead className="text-start hidden xl:table-cell">{t.taxNumber}</TableHead>
                        <TableHead className="text-start">{t.status}</TableHead>
                        <TableHead className="text-start">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id} className="group">
                          <TableCell>
                            <span className="font-medium text-foreground">
                              {customer.name}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-muted-foreground">
                              {customer.email || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span dir="ltr" className="text-muted-foreground">
                              {customer.phone || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-muted-foreground">
                              {customer.city || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <span dir="ltr" className="text-muted-foreground font-mono text-xs">
                              {customer.tax_id || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={customer.is_active ? 'default' : 'secondary'}
                              className={
                                customer.is_active
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700'
                              }
                            >
                              {customer.is_active
                                ? isRtl
                                  ? 'نشط'
                                  : 'Active'
                                : isRtl
                                  ? 'غير نشط'
                                  : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(customer)}
                                title={t.edit}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteClick(customer)}
                                title={t.delete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

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
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            className={
                              currentPage === 1
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                        {pageNumbers.map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={currentPage === page}
                              onClick={() => setCurrentPage(page)}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            className={
                              currentPage === totalPages
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? t.editCustomer : t.newCustomer}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Customer Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {t.customerName}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={
                    isRtl
                      ? 'أدخل اسم العميل'
                      : 'Enter customer name'
                  }
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={
                    isRtl
                      ? 'أدخل البريد الإلكتروني'
                      : 'Enter email address'
                  }
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Phone */}
              <div className="grid gap-2">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={
                    isRtl ? 'أدخل رقم الهاتف' : 'Enter phone number'
                  }
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Address */}
              <div className="grid gap-2">
                <Label htmlFor="address">{t.address}</Label>
                <Textarea
                  id="address"
                  placeholder={
                    isRtl ? 'أدخل العنوان' : 'Enter address'
                  }
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={2}
                />
              </div>

              {/* City & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">{isRtl ? 'المدينة' : 'City'}</Label>
                  <Input
                    id="city"
                    placeholder={isRtl ? 'أدخل المدينة' : 'Enter city'}
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">{isRtl ? 'الدولة' : 'Country'}</Label>
                  <Input
                    id="country"
                    placeholder={isRtl ? 'أدخل الدولة' : 'Enter country'}
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  />
                </div>
              </div>

              {/* Tax ID */}
              <div className="grid gap-2">
                <Label htmlFor="tax_id">{t.taxNumber}</Label>
                <Input
                  id="tax_id"
                  placeholder={
                    isRtl
                      ? 'أدخل الرقم الضريبي'
                      : 'Enter tax number'
                  }
                  value={formData.tax_id}
                  onChange={(e) => updateField('tax_id', e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">{t.notes}</Label>
                <Textarea
                  id="notes"
                  placeholder={isRtl ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                {t.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting
                  ? t.loading
                  : editingCustomer
                    ? t.save
                    : t.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation AlertDialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.areYouSure}</AlertDialogTitle>
              <AlertDialogDescription>
                {isRtl
                  ? `هل أنت متأكد من حذف العميل "${deletingCustomer?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete customer "${deletingCustomer?.name}"? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isDeleting ? t.loading : t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
