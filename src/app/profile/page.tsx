'use client';

import { useState } from 'react';
import { useAuthStore, useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Building2,
  Key,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function ProfilePage() {
  const { language } = useAppSettings();
  const { user } = useAuthStore();
  const t = translations[language];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(language === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const roleLabels: Record<string, string> = {
    admin: t.admin,
    manager: t.manager,
    user: t.user,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {language === 'ar'
            ? 'إدارة معلومات حسابك وإعدادات الأمان'
            : 'Manage your account information and security settings'}
        </p>
      </div>

      {/* Profile Info Card */}
      <Card className="border-emerald-100 dark:border-emerald-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {language === 'ar' ? 'معلومات الحساب' : 'Account Information'}
          </CardTitle>
          <CardDescription>
            {language === 'ar'
              ? 'تفاصيل حسابك ودورك في النظام'
              : 'Your account details and role in the system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'م'}
              </AvatarFallback>
            </Avatar>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {t.name}
                  </Label>
                  <p className="font-medium text-foreground">{user?.name || '---'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {t.email}
                  </Label>
                  <p className="font-medium text-foreground" dir="ltr">{user?.email || '---'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {t.userRole}
                  </Label>
                  <Badge className={roleColors[user?.role || 'user']}>
                    {roleLabels[user?.role || 'user']}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {language === 'ar' ? 'معرف المؤسسة' : 'Tenant ID'}
                  </Label>
                  <p className="font-mono text-sm text-foreground" dir="ltr">
                    {user?.tenant_id?.slice(0, 8) || '---'}...
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
                  </Label>
                  <p className="text-foreground" dir="ltr">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                      : '---'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-emerald-100 dark:border-emerald-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </CardTitle>
          <CardDescription>
            {language === 'ar'
              ? 'قم بتحديث كلمة المرور الخاصة بك للحفاظ على أمان حسابك'
              : 'Update your password to keep your account secure'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">
                {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
              </Label>
              <div className="relative">
                <Key className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="current-password"
                  type="password"
                  placeholder={language === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="ps-10"
                  dir="ltr"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-password">
                {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </Label>
              <div className="relative">
                <Key className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder={language === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="ps-10"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {t.confirmPassword}
              </Label>
              <div className="relative">
                <CheckCircle2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder={t.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="ps-10"
                  dir="ltr"
                />
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'ar' ? 'جاري التغيير...' : 'Changing...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips Card */}
      <Card className="border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Shield className="h-5 w-5" />
            {language === 'ar' ? 'نصائح الأمان' : 'Security Tips'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {language === 'ar'
                ? 'استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز'
                : 'Use a strong password with letters, numbers, and symbols'}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {language === 'ar'
                ? 'لا تشارك كلمة المرور مع أي شخص'
                : 'Never share your password with anyone'}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {language === 'ar'
                ? 'قم بتغيير كلمة المرور بشكل دوري'
                : 'Change your password periodically'}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {language === 'ar'
                ? 'تأكد من تسجيل الخروج عند الانتهاء من العمل'
                : 'Make sure to log out when you finish working'}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
