'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User as ApiUser, type CreateUserInput, type UpdateUserInput } from '@/lib/api';
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
  UserCog,
  Plus,
  Shield,
  UserCheck,
  User,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Eye,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Role type from Rust backend
type UserRole = 'admin' | 'accountant' | 'user' | 'viewer';

// Role configuration with Arabic/English labels
const roleConfig: Record<
  UserRole,
  {
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    colorClass: string;
    avatarBg: string;
  }
> = {
  admin: {
    labelAr: 'مدير',
    labelEn: 'Admin',
    icon: Shield,
    colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    avatarBg: 'bg-red-500',
  },
  accountant: {
    labelAr: 'محاسب',
    labelEn: 'Accountant',
    icon: BookOpen,
    colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    avatarBg: 'bg-amber-500',
  },
  user: {
    labelAr: 'مستخدم',
    labelEn: 'User',
    icon: User,
    colorClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    avatarBg: 'bg-gray-500',
  },
  viewer: {
    labelAr: 'مشاهد',
    labelEn: 'Viewer',
    icon: Eye,
    colorClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    avatarBg: 'bg-teal-500',
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

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return parts[0].charAt(0) + parts[1].charAt(0);
  }
  return parts[0].charAt(0);
}

export default function UsersPage() {
  const { language } = useAppSettings();
  const t = translations[language];
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    tenant_id: '',
    role: 'user' as UserRole,
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'user' as UserRole,
    is_active: true,
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ApiUser | null>(null);

  const resetCreateForm = () => {
    setCreateForm({ name: '', email: '', password: '', tenant_id: '', role: 'user' });
  };

  const resetEditForm = () => {
    setEditForm({ id: '', name: '', email: '', role: 'user', is_active: true });
  };

  // ---- Queries ----
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users', page],
    queryFn: () => api.getUsers({ page, per_page: 50 }),
  });

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-users'],
    queryFn: () => api.getTenants({ per_page: 100 }),
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateUserInput) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      resetCreateForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      resetEditForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
  });

  const handleCreateUser = () => {
    createMutation.mutate({
      email: createForm.email,
      password: createForm.password,
      name: createForm.name,
      tenant_id: createForm.tenant_id,
      role: createForm.role,
    });
  };

  const handleEditUser = () => {
    updateMutation.mutate({
      id: editForm.id,
      data: {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      },
    });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteMutation.mutate(userToDelete.id);
  };

  const openEditDialog = (user: ApiUser) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      is_active: user.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: ApiUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // ---- Derived data ----
  const users = usersData?.users ?? [];
  const tenants = tenantsData?.tenants ?? [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  // Client-side search filtering
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const accountantCount = users.filter((u) => u.role === 'accountant').length;
  const userCount = users.filter((u) => u.role === 'user').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.users}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {usersLoading
                ? t.loading
                : language === 'ar'
                  ? `إجمالي ${users.length} مستخدم`
                  : `${users.length} users total`}
            </p>
          </div>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t.newUser}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30">
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.admin}</p>
                  <p className="text-lg font-bold">{adminCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'محاسبون' : 'Accountants'}
                  </p>
                  <p className="text-lg font-bold">{accountantCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.user}</p>
                  <p className="text-lg font-bold">{userCount}</p>
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
                    <TableHead className="text-right">{t.name}</TableHead>
                    <TableHead className="text-right">{t.email}</TableHead>
                    <TableHead className="text-right">{t.userRole}</TableHead>
                    <TableHead className="text-right">
                      {language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
                    </TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        {t.loading}
                      </TableCell>
                    </TableRow>
                  ) : usersError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-destructive">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                        {usersError.message}
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userRecord) => {
                      const role = roleConfig[userRecord.role as UserRole] ?? roleConfig.user;
                      const RoleIcon = role.icon;
                      return (
                        <TableRow key={userRecord.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback
                                  className={`${role.avatarBg} text-white text-xs font-medium`}
                                >
                                  {getInitials(userRecord.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{userRecord.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {userRecord.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`gap-1.5 ${role.colorClass} border-0 font-medium`}
                            >
                              <RoleIcon className="h-3.5 w-3.5" />
                              {language === 'ar' ? role.labelAr : role.labelEn}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(userRecord.created_at, language)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu dir={language === 'ar' ? 'rtl' : 'ltr'}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => openEditDialog(userRecord)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  {t.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => openDeleteDialog(userRecord)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t.delete}
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

        {/* Create User Dialog */}
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogContent className="sm:max-w-[450px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{t.newUser}</DialogTitle>
              <DialogDescription>
                {language === 'ar'
                  ? 'أدخل بيانات المستخدم الجديد'
                  : 'Enter the new user details'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">{t.name}</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={language === 'ar' ? 'اسم المستخدم' : 'User name'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-email">{t.email}</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-password">{t.password}</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={language === 'ar' ? 'كلمة المرور' : 'Password'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-tenant">{t.tenants}</Label>
                <Select
                  value={createForm.tenant_id}
                  onValueChange={(val) => setCreateForm((f) => ({ ...f, tenant_id: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={language === 'ar' ? 'اختر المؤسسة' : 'Select tenant'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t.userRole}</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) =>
                    setCreateForm((f) => ({ ...f, role: val as UserRole }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                      const cfg = roleConfig[role];
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={role} value={role}>
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
            </div>
            {createMutation.error && (
              <div className="flex items-center gap-2 text-sm text-destructive mb-2 px-1">
                <AlertCircle className="h-4 w-4" />
                {createMutation.error.message}
              </div>
            )}
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
                onClick={handleCreateUser}
                disabled={!createForm.name || !createForm.email || !createForm.password || !createForm.tenant_id || createMutation.isPending}
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

        {/* Edit User Dialog */}
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
                {language === 'ar' ? 'تعديل المستخدم' : 'Edit User'}
              </DialogTitle>
              <DialogDescription>
                {language === 'ar'
                  ? 'تعديل بيانات المستخدم'
                  : 'Update user details'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t.name}</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{t.email}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t.userRole}</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val) =>
                    setEditForm((f) => ({ ...f, role: val as UserRole }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                      const cfg = roleConfig[role];
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={role} value={role}>
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
              <div className="grid gap-2">
                <Label>{t.isActive}</Label>
                <Select
                  value={editForm.is_active ? 'true' : 'false'}
                  onValueChange={(val) =>
                    setEditForm((f) => ({ ...f, is_active: val === 'true' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </SelectItem>
                    <SelectItem value="false">
                      {language === 'ar' ? 'غير نشط' : 'Inactive'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {updateMutation.error && (
              <div className="flex items-center gap-2 text-sm text-destructive mb-2 px-1">
                <AlertCircle className="h-4 w-4" />
                {updateMutation.error.message}
              </div>
            )}
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
                onClick={handleEditUser}
                disabled={!editForm.name || !editForm.email || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loading}
                  </span>
                ) : t.save}
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
                  ? `هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟ ${t.thisActionCannot}`
                  : `Are you sure you want to delete user "${userToDelete?.name}"? ${t.thisActionCannot}`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteMutation.error && (
              <div className="flex items-center gap-2 text-sm text-destructive px-1">
                <AlertCircle className="h-4 w-4" />
                {deleteMutation.error.message}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loading}
                  </span>
                ) : t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
