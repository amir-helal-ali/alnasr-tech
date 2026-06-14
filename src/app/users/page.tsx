'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Types
interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  createdAt: string;
}

// Mock data
const mockUsers: UserRecord[] = [
  {
    id: '1',
    name: 'أحمد محمد علي',
    email: 'ahmed@alnasr-tech.com',
    role: 'admin',
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    name: 'فاطمة حسن إبراهيم',
    email: 'fatma@alnasr-tech.com',
    role: 'manager',
    createdAt: '2025-02-20',
  },
  {
    id: '3',
    name: 'محمد سعيد عبدالله',
    email: 'mohamed@alnasr-tech.com',
    role: 'user',
    createdAt: '2025-03-10',
  },
  {
    id: '4',
    name: 'نور الدين خالد',
    email: 'nour@alnasr-tech.com',
    role: 'manager',
    createdAt: '2025-04-05',
  },
  {
    id: '5',
    name: 'سارة أحمد يوسف',
    email: 'sara@alnasr-tech.com',
    role: 'user',
    createdAt: '2025-05-12',
  },
  {
    id: '6',
    name: 'عمر حسين محمود',
    email: 'omar@alnasr-tech.com',
    role: 'user',
    createdAt: '2025-06-01',
  },
  {
    id: '7',
    name: 'ياسمين عبد الرحمن',
    email: 'yasmin@alnasr-tech.com',
    role: 'admin',
    createdAt: '2025-06-10',
  },
];

const roleConfig: Record<
  UserRecord['role'],
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
  manager: {
    labelAr: 'مدير فرعي',
    labelEn: 'Manager',
    icon: UserCheck,
    colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    avatarBg: 'bg-blue-500',
  },
  user: {
    labelAr: 'مستخدم',
    labelEn: 'User',
    icon: User,
    colorClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    avatarBg: 'bg-gray-500',
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

  const [users, setUsers] = useState<UserRecord[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as UserRecord['role'],
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'user' as UserRecord['role'],
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);

  const resetCreateForm = () => {
    setCreateForm({ name: '', email: '', password: '', role: 'user' });
  };

  const resetEditForm = () => {
    setEditForm({ id: '', name: '', email: '', password: '', role: 'user' });
  };

  const handleCreateUser = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newUser: UserRecord = {
        id: String(Date.now()),
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      setIsSubmitting(false);
      setCreateDialogOpen(false);
      resetCreateForm();
    }, 500);
  };

  const handleEditUser = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editForm.id
            ? {
                ...u,
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
              }
            : u
        )
      );
      setIsSubmitting(false);
      setEditDialogOpen(false);
      resetEditForm();
    }, 500);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const openEditDialog = (user: UserRecord) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserRecord) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const managerCount = users.filter((u) => u.role === 'manager').length;
  const userCount = users.filter((u) => u.role === 'user').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.users}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'ar'
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
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.manager}</p>
                  <p className="text-lg font-bold">{managerCount}</p>
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
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userRecord) => {
                      const role = roleConfig[userRecord.role];
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
                            {formatDate(userRecord.createdAt, language)}
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
                <Label>{t.userRole}</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) =>
                    setCreateForm((f) => ({ ...f, role: val as UserRecord['role'] }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t.admin}
                      </span>
                    </SelectItem>
                    <SelectItem value="manager">
                      <span className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        {t.manager}
                      </span>
                    </SelectItem>
                    <SelectItem value="user">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t.user}
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
                onClick={handleCreateUser}
                disabled={!createForm.name || !createForm.email || !createForm.password || isSubmitting}
              >
                {isSubmitting ? t.loading : t.create}
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
                <Label htmlFor="edit-password">
                  {t.password}
                  <span className="text-muted-foreground text-xs font-normal mr-1">
                    ({language === 'ar' ? 'اتركه فارغاً للإبقاء' : 'Leave blank to keep current'})
                  </span>
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={language === 'ar' ? 'كلمة مرور جديدة (اختياري)' : 'New password (optional)'}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t.userRole}</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val) =>
                    setEditForm((f) => ({ ...f, role: val as UserRecord['role'] }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t.admin}
                      </span>
                    </SelectItem>
                    <SelectItem value="manager">
                      <span className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        {t.manager}
                      </span>
                    </SelectItem>
                    <SelectItem value="user">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t.user}
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
                onClick={handleEditUser}
                disabled={!editForm.name || !editForm.email || isSubmitting}
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
                  ? `هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟ ${t.thisActionCannot}`
                  : `Are you sure you want to delete user "${userToDelete?.name}"? ${t.thisActionCannot}`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
