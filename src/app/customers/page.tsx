'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
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
import { Search, Plus, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Types
interface Customer {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  isActive: boolean;
  createdAt: string;
}

interface CustomerFormData {
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
}

const initialFormData: CustomerFormData = {
  name: '',
  nameAr: '',
  email: '',
  phone: '',
  address: '',
  taxNumber: '',
};

// Mock data - realistic Egyptian company names
const initialCustomers: Customer[] = [
  {
    id: '1',
    name: 'Al-Nile Trading Co.',
    nameAr: 'شركة النيل للتجارة',
    email: 'info@alnile-trading.com',
    phone: '+20 2 2345 6789',
    address: '15 شارع النيل، المعادي، القاهرة',
    taxNumber: '300-123-4567',
    isActive: true,
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    name: 'Al-Ahram Establishment',
    nameAr: 'مؤسسة الأهرام',
    email: 'contact@alahram-eg.com',
    phone: '+20 2 2678 9012',
    address: '42 شارع الأهرام، الجيزة',
    taxNumber: '301-234-5678',
    isActive: true,
    createdAt: '2025-02-20',
  },
  {
    id: '3',
    name: 'Al-Salam Import Co.',
    nameAr: 'شركة السلام للاستيراد',
    email: 'sales@alsalam-import.com',
    phone: '+20 3 4567 8901',
    address: '8 شارع السلام، الإسكندرية',
    taxNumber: '302-345-6789',
    isActive: true,
    createdAt: '2025-03-10',
  },
  {
    id: '4',
    name: 'Al-Hurriya Industrial Factory',
    nameAr: 'مصنع الحرية الصناعي',
    email: 'factory@hurriya-ind.com',
    phone: '+20 2 2890 1234',
    address: 'المنطقة الصناعية، حلوان، القاهرة',
    taxNumber: '303-456-7890',
    isActive: false,
    createdAt: '2025-03-25',
  },
  {
    id: '5',
    name: 'Al-Wadi Distribution Co.',
    nameAr: 'شركة الوادي للتوزيع',
    email: 'info@alwadi-dist.com',
    phone: '+20 2 3123 4567',
    address: '33 شارع الوادي، مدينة نصر، القاهرة',
    taxNumber: '304-567-8901',
    isActive: true,
    createdAt: '2025-04-05',
  },
  {
    id: '6',
    name: 'Al-Nour Holding Group',
    nameAr: 'مجموعة النور القابضة',
    email: 'hq@alnour-holding.com',
    phone: '+20 2 4456 7890',
    address: 'مجمع النور، طريق مصر الإسماعيلية الصحراوي',
    taxNumber: '305-678-9012',
    isActive: true,
    createdAt: '2025-04-18',
  },
  {
    id: '7',
    name: 'Al-Fath Construction Co.',
    nameAr: 'شركة الفتح للبناء',
    email: 'projects@alfath-build.com',
    phone: '+20 2 5789 0123',
    address: '77 شارع التحرير، الدقي، الجيزة',
    taxNumber: '306-789-0123',
    isActive: true,
    createdAt: '2025-05-02',
  },
  {
    id: '8',
    name: 'Al-Safa Trading Establishment',
    nameAr: 'مؤسسة الصفا التجارية',
    email: 'office@alsafa-trade.com',
    phone: '+20 3 6012 3456',
    address: '21 شارع الصفا، سموحة، الإسكندرية',
    taxNumber: '307-890-1234',
    isActive: false,
    createdAt: '2025-05-20',
  },
];

const ITEMS_PER_PAGE = 5;

export default function CustomersPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const isRtl = language === 'ar';

  // State
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.nameAr.includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query)
    );
  }, [customers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  // Open create dialog
  function handleCreate() {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  }

  // Open edit dialog
  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      nameAr: customer.nameAr,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      taxNumber: customer.taxNumber,
    });
    setIsDialogOpen(true);
  }

  // Open delete confirmation
  function handleDeleteClick(customer: Customer) {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  }

  // Submit form (create or edit)
  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error(isRtl ? 'اسم العميل مطلوب' : 'Customer name is required');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? { ...c, ...formData }
            : c
        )
      );
      toast.success(
        isRtl ? 'تم تحديث العميل بنجاح' : 'Customer updated successfully'
      );
    } else {
      const newCustomer: Customer = {
        id: String(Date.now()),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      toast.success(
        isRtl ? 'تم إنشاء العميل بنجاح' : 'Customer created successfully'
      );
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingCustomer(null);
  }

  // Confirm delete
  async function handleConfirmDelete() {
    if (!deletingCustomer) return;

    setIsDeleting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));

    setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
    toast.success(
      isRtl ? 'تم حذف العميل بنجاح' : 'Customer deleted successfully'
    );

    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setDeletingCustomer(null);

    // Adjust page if needed
    const remaining = filteredCustomers.length - 1;
    const maxPage = Math.ceil(remaining / ITEMS_PER_PAGE);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    }
  }

  // Update form field
  function updateField(field: keyof CustomerFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Handle search change with page reset
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
                  ? `${customers.length} عميل مسجل`
                  : `${customers.length} registered customers`}
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
                    <TableHead className="text-start">{t.customerNameAr}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{t.email}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{t.phone}</TableHead>
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
                      <TableCell>
                        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
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
            ) : paginatedCustomers.length === 0 ? (
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
                        <TableHead className="text-start">{t.customerNameAr}</TableHead>
                        <TableHead className="text-start hidden md:table-cell">{t.email}</TableHead>
                        <TableHead className="text-start hidden lg:table-cell">{t.phone}</TableHead>
                        <TableHead className="text-start hidden xl:table-cell">{t.taxNumber}</TableHead>
                        <TableHead className="text-start">{t.status}</TableHead>
                        <TableHead className="text-start">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.map((customer) => (
                        <TableRow key={customer.id} className="group">
                          <TableCell>
                            <span className="font-medium text-foreground">
                              {customer.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">
                              {customer.nameAr}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-muted-foreground">
                              {customer.email}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span dir="ltr" className="text-muted-foreground">
                              {customer.phone}
                            </span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <span dir="ltr" className="text-muted-foreground font-mono text-xs">
                              {customer.taxNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={customer.isActive ? 'default' : 'secondary'}
                              className={
                                customer.isActive
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700'
                              }
                            >
                              {customer.isActive
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
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          filteredCustomers.length
                        )}
                      </span>{' '}
                      {t.of}{' '}
                      <span className="font-medium text-foreground">
                        {filteredCustomers.length}
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
              {/* Customer Name (English) */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {t.customerName}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={
                    isRtl
                      ? 'أدخل اسم العميل بالإنجليزية'
                      : 'Enter customer name in English'
                  }
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Customer Name (Arabic) */}
              <div className="grid gap-2">
                <Label htmlFor="nameAr">{t.customerNameAr}</Label>
                <Input
                  id="nameAr"
                  placeholder={
                    isRtl
                      ? 'أدخل اسم العميل بالعربية'
                      : 'Enter customer name in Arabic'
                  }
                  value={formData.nameAr}
                  onChange={(e) => updateField('nameAr', e.target.value)}
                  dir="rtl"
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
                  dir="rtl"
                  rows={3}
                />
              </div>

              {/* Tax Number */}
              <div className="grid gap-2">
                <Label htmlFor="taxNumber">{t.taxNumber}</Label>
                <Input
                  id="taxNumber"
                  placeholder={
                    isRtl
                      ? 'أدخل الرقم الضريبي'
                      : 'Enter tax number'
                  }
                  value={formData.taxNumber}
                  onChange={(e) => updateField('taxNumber', e.target.value)}
                  dir="ltr"
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
                  ? `هل أنت متأكد من حذف العميل "${deletingCustomer?.nameAr}"؟ لا يمكن التراجع عن هذا الإجراء.`
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
