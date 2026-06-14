'use client';

import { useAppSettings, useAuthStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Globe, Palette, Shield, Bell, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useState } from 'react';

export default function SettingsPage() {
  const { language, setLanguage } = useAppSettings();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const t = translations[language];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    toast.success(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t.settings}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {language === 'ar' ? 'إدارة إعدادات حسابك وتفضيلاتك' : 'Manage your account settings and preferences'}
          </p>
        </div>

        <Tabs defaultValue="general" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              {language === 'ar' ? 'عام' : 'General'}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              {language === 'ar' ? 'المظهر' : 'Appearance'}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              {language === 'ar' ? 'الأمان' : 'Security'}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.language}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'اختر لغة الواجهة' : 'Choose interface language'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={language} onValueChange={(v) => setLanguage(v as 'ar' | 'en')}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">🇪🇬 العربية</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {language === 'ar' ? 'معلومات الحساب' : 'Account Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.name}</Label>
                    <Input value={user?.name || 'مدير النظام'} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.email}</Label>
                    <Input value={user?.email || 'admin@alnasr-tech.com'} dir="ltr" readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.userRole}</Label>
                    <Input value={user?.role || 'admin'} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المؤسسة' : 'Organization'}</Label>
                    <Input value={language === 'ar' ? 'النصر تك' : 'Al-Nasr Tech'} readOnly className="bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.theme}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'اختر مظهر الواجهة' : 'Choose interface appearance'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-full h-20 rounded-lg bg-white border mb-3 flex items-center justify-center">
                      <span className="text-2xl">☀️</span>
                    </div>
                    <p className="text-sm font-medium text-center">{t.light}</p>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-full h-20 rounded-lg bg-gray-900 border border-gray-700 mb-3 flex items-center justify-center">
                      <span className="text-2xl">🌙</span>
                    </div>
                    <p className="text-sm font-medium text-center">{t.dark}</p>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-full h-20 rounded-lg bg-gradient-to-r from-white to-gray-900 border mb-3 flex items-center justify-center">
                      <span className="text-2xl">💻</span>
                    </div>
                    <p className="text-sm font-medium text-center">{t.system}</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar'
                    ? 'أدخل كلمة المرور الحالية والجديدة لتغييرها'
                    : 'Enter your current and new password to change it'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                  />
                </div>
                <Button onClick={handleChangePassword} className="mt-2">
                  {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <span className="text-lg">💻</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{language === 'ar' ? 'الجلسة الحالية' : 'Current Session'}</p>
                        <p className="text-xs text-muted-foreground">Chrome · Cairo, Egypt</p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      {language === 'ar' ? 'نشطة' : 'Active'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'اختر الإشعارات التي تريد تلقيها' : 'Choose which notifications you want to receive'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: 'invoice_created',
                    label: language === 'ar' ? 'إنشاء فاتورة جديدة' : 'New invoice created',
                    desc: language === 'ar' ? 'إشعار عند إنشاء فاتورة جديدة' : 'Notify when a new invoice is created',
                  },
                  {
                    key: 'payment_received',
                    label: language === 'ar' ? 'استلام دفعة' : 'Payment received',
                    desc: language === 'ar' ? 'إشعار عند استلام دفعة' : 'Notify when a payment is received',
                  },
                  {
                    key: 'eta_status',
                    label: language === 'ar' ? 'حالة الفوترة الإلكترونية' : 'E-Invoicing status',
                    desc: language === 'ar' ? 'إشعار عند تحديث حالة الفاتورة الإلكترونية' : 'Notify when e-invoice status changes',
                  },
                  {
                    key: 'invoice_overdue',
                    label: language === 'ar' ? 'فاتورة متأخرة' : 'Invoice overdue',
                    desc: language === 'ar' ? 'إشعار عند تأخر سداد فاتورة' : 'Notify when an invoice is overdue',
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
