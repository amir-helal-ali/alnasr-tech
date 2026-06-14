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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Crown,
  Rocket,
  Gift,
  Star,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
} from 'lucide-react';

// Types
interface TenantRecord {
  id: string;
  name: string;
  nameAr: string;
  subscriptionPlan: 'free' | 'basic' | 'premium' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

// Mock data
const mockTenants: TenantRecord[] = [
  {
    id: '1',
    name: 'Al-Nasr Tech',
    nameAr: 'النصر تك',
    subscriptionPlan: 'enterprise',
    isActive: true,
    createdAt: '2024-01-01',
    userCount: 45,
  },
  {
    id: '2',
    name: 'Nile Commerce',
    nameAr: 'تجارة النيل',
    subscriptionPlan: 'premium',
    isActive: true,
    createdAt: '2024-03-15',
    userCount: 28,
  },
  {
    id: '3',
    name: 'Pyramids Group',
    nameAr: 'مجموعة الأهرام',
    subscriptionPlan: 'basic',
    isActive: true,
    createdAt: '2024-06-20',
    userCount: 12,
  },
  {
    id: '4',
    name: 'Freedom Factory',
    nameAr: 'مصنع الحرية',
    subscriptionPlan: 'basic',
    isActive: false,
    createdAt: '2024-08-10',
    userCount: 8,
  },
  {
    id: '5',
    name: 'Wadi Corp',
    nameAr: 'شركة الوادي',
    subscriptionPlan: 'free',
    isActive: true,
    createdAt: '2025-01-05',
    userCount: 3,
  },
  {
    id: '6',
    name: 'Noor Holdings',
    nameAr: 'مجموعة النور القابضة',
    subscriptionPlan: 'premium',
    isActive: true,
    createdAt: '2025-02-18',
    userCount: 22,
  },
];

const planConfig: Record<
  TenantRecord['subscriptionPlan'],
  {
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    colorClass: string;
    borderColor: string;
    bgGradient: string;
  }
> = {
  free: {
    labelAr: 'مجاني',
    labelEn: 'Free',
    icon: Gift,
    colorClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-700',
    bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50',
  },
  basic: {
    labelAr: 'أساسي',
    labelEn: 'Basic',
    icon: Rocket,
    colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    bgGradient: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
  },
  premium: {
    labelAr: 'مميز',
    labelEn: 'Premium',
    icon: Star,
    colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    bgGradient: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20',
  },
  enterprise: {
    labelAr: 'مؤسسي',
    labelEn: 'Enterprise',
    icon: Crown,
    colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    bgGradient: 'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20',
  },
};

function formatDate(dateStr: string, lang: 'ar' | 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TenantsPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const [tenants, setTenants] = useState<TenantRecord[]>(mockTenants);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    nameAr: '',
    subscriptionPlan: 'free' as TenantRecord['subscriptionPlan'],
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    nameAr: '',
    subscriptionPlan: 'free' as TenantRecord['subscriptionPlan'],
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantRecord | null>(null);

  const resetCreateForm = () => {
    setCreateForm({ name: '', nameAr: '', subscriptionPlan: 'free' });
  };

  const resetEditForm = () => {
    setEditForm({ id: '', name: '', nameAr: '', subscriptionPlan: 'free' });
  };

  const handleCreateTenant = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newTenant: TenantRecord = {
        id: String(Date.now()),
        name: createForm.name,
        nameAr: createForm.nameAr,
        subscriptionPlan: createForm.subscriptionPlan,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
        userCount: 0,
      };
      setTenants((prev) => [newTenant, ...prev]);
      setIsSubmitting(false);
      setCreateDialogOpen(false);
      resetCreateForm();
    }, 500);
  };

  const handleEditTenant = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editForm.id
            ? {
                ...t,
                name: editForm.name,
                nameAr: editForm.nameAr,
                subscriptionPlan: editForm.subscriptionPlan,
              }
            : t
        )
      );
      setIsSubmitting(false);
      setEditDialogOpen(false);
      resetEditForm();
    }, 500);
  };

  const handleDeleteTenant = () => {
    if (!tenantToDelete) return;
    setTenants((prev) => prev.filter((t) => t.id !== tenantToDelete.id));
    setDeleteDialogOpen(false);
    setTenantToDelete(null);
  };

  const openEditDialog = (tenant: TenantRecord) => {
    setEditForm({
      id: tenant.id,
      name: tenant.name,
      nameAr: tenant.nameAr,
      subscriptionPlan: tenant.subscriptionPlan,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (tenant: TenantRecord) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nameAr.includes(searchQuery)
  );

  // Summary stats
  const activeCount = tenants.filter((t) => t.isActive).length;
  const inactiveCount = tenants.filter((t) => !t.isActive).length;
  const totalUsers = tenants.reduce((s, t) => s + t.userCount, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.tenants}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'ar'
                ? `إجمالي ${tenants.length} مؤسسة — ${activeCount} نشطة`
                : `${tenants.length} tenants — ${activeCount} active`}
            </p>
          </div>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'مؤسسة جديدة' : 'New Tenant'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'مؤسسات نشطة' : 'Active Tenants'}
                  </p>
                  <p className="text-lg font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'مؤسسات غير نشطة' : 'Inactive Tenants'}
                  </p>
                  <p className="text-lg font-bold">{inactiveCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/30">
                  <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
                  </p>
                  <p className="text-lg font-bold">{totalUsers}</p>
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

        {/* Card Grid */}
        {filteredTenants.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t.noData}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => {
              const plan = planConfig[tenant.subscriptionPlan];
              const PlanIcon = plan.icon;
              return (
                <Card
                  key={tenant.id}
                  className={`group hover:shadow-lg transition-all duration-200 border ${plan.borderColor} overflow-hidden`}
                >
                  {/* Top gradient strip */}
                  <div className={`h-1.5 bg-gradient-to-l ${plan.bgGradient}`} />
                  <CardHeader className="pb-3 pt-4 px-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.bgGradient}`}
                        >
                          <Building2 className="h-6 w-6 text-foreground/70" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold leading-tight">
                            {language === 'ar' && tenant.nameAr ? tenant.nameAr : tenant.name}
                          </CardTitle>
                          {language === 'ar' && tenant.nameAr && (
                            <p className="text-xs text-muted-foreground mt-0.5">{tenant.name}</p>
                          )}
                          {language === 'en' && tenant.nameAr && (
                            <p className="text-xs text-muted-foreground mt-0.5">{tenant.nameAr}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`gap-1 ${plan.colorClass} border-0 font-medium text-xs`}
                      >
                        <PlanIcon className="h-3 w-3" />
                        {language === 'ar' ? plan.labelAr : plan.labelEn}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {tenant.isActive ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {language === 'ar' ? 'نشط' : 'Active'}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                          >
                            <XCircle className="h-3 w-3" />
                            {language === 'ar' ? 'غير نشط' : 'Inactive'}
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>
                            {tenant.userCount} {language === 'ar' ? 'مستخدم' : 'users'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(tenant.createdAt, language)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 flex-1 h-8"
                          onClick={() => openEditDialog(tenant)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t.edit}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => openDeleteDialog(tenant)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t.delete}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Tenant Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-[450px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'مؤسسة جديدة' : 'New Tenant'}</DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'أدخل بيانات المؤسسة الجديدة'
                : 'Enter the new tenant details'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">{t.tenantName}</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم المؤسسة بالإنجليزية' : 'Tenant name'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-name-ar">{t.tenantNameAr}</Label>
              <Input
                id="create-name-ar"
                value={createForm.nameAr}
                onChange={(e) => setCreateForm((f) => ({ ...f, nameAr: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم المؤسسة بالعربية' : 'Tenant name (Arabic)'}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.subscriptionPlan}</Label>
              <Select
                value={createForm.subscriptionPlan}
                onValueChange={(val) =>
                  setCreateForm((f) => ({
                    ...f,
                    subscriptionPlan: val as TenantRecord['subscriptionPlan'],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {t.free}
                    </span>
                  </SelectItem>
                  <SelectItem value="basic">
                    <span className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      {t.basic}
                    </span>
                  </SelectItem>
                  <SelectItem value="premium">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      {t.premium}
                    </span>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      {t.enterprise}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleCreateTenant}
              disabled={!createForm.name || isSubmitting}
            >
              {isSubmitting ? t.loading : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="sm:max-w-[450px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تعديل المؤسسة' : 'Edit Tenant'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'تعديل بيانات المؤسسة'
                : 'Update tenant details'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t.tenantName}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name-ar">{t.tenantNameAr}</Label>
              <Input
                id="edit-name-ar"
                value={editForm.nameAr}
                onChange={(e) => setEditForm((f) => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.subscriptionPlan}</Label>
              <Select
                value={editForm.subscriptionPlan}
                onValueChange={(val) =>
                  setEditForm((f) => ({
                    ...f,
                    subscriptionPlan: val as TenantRecord['subscriptionPlan'],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {t.free}
                    </span>
                  </SelectItem>
                  <SelectItem value="basic">
                    <span className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      {t.basic}
                    </span>
                  </SelectItem>
                  <SelectItem value="premium">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      {t.premium}
                    </span>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      {t.enterprise}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetEditForm();
              }}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleEditTenant}
              disabled={!editForm.name || isSubmitting}
            >
              {isSubmitting ? t.loading : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.areYouSure}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? `هل أنت متأكد من حذف المؤسسة "${tenantToDelete?.nameAr || tenantToDelete?.name}"؟ ${t.thisActionCannot}`
                : `Are you sure you want to delete tenant "${tenantToDelete?.name}"? ${t.thisActionCannot}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
