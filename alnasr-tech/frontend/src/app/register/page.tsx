'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore, useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Eye, EyeOff, User, Building2, Globe } from 'lucide-react';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  tenantId?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { language, setLanguage } = useAppSettings();
  const t = translations[language];
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!name.trim()) {
      errors.name = t.requiredField;
    }

    if (!email.trim()) {
      errors.email = t.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t.invalidEmail;
    }

    if (!password.trim()) {
      errors.password = t.requiredField;
    } else if (password.length < 6) {
      errors.password = language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = t.requiredField;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t.passwordMismatch;
    }

    // tenant_id is optional in the Rust backend, so no validation required

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (localErrors[field]) {
      setLocalErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    try {
      // api.register() takes { email, password, name, tenant_id? }
      // and returns { token, refresh_token, user }
      await register({
        email,
        password,
        name,
        tenant_id: tenantId.trim() || undefined,
      });
      toast.success(t.registerSuccess);
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || t.loginError);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const fieldAnimation = (delay: number) => ({
    initial: { opacity: 0, x: language === 'ar' ? 20 : -20 },
    animate: { opacity: 1, x: 0 },
    transition: { delay, duration: 0.3 },
  });

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-200/30 dark:bg-teal-800/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-green-100/20 dark:bg-green-900/5 rounded-full blur-3xl" />
        {/* Geometric pattern */}
        <svg className="absolute top-16 right-10 w-20 h-20 text-teal-200/40 dark:text-teal-700/20" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12,2 22,22 2,22" />
        </svg>
        <svg className="absolute bottom-24 left-16 w-14 h-14 text-emerald-200/40 dark:text-emerald-700/20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        <svg className="absolute top-1/2 left-8 w-10 h-10 text-green-300/30 dark:text-green-700/15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-700/30 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm"
      >
        <Globe className="h-4 w-4" />
        {language === 'ar' ? 'EN' : 'عربي'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card className="border-emerald-100/50 dark:border-emerald-800/30 shadow-xl shadow-emerald-900/5 dark:shadow-emerald-900/20 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Logo & App Name */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Image
                  src="/logo.svg"
                  alt="Al-Nasr Tech"
                  width={36}
                  height={36}
                  className="brightness-0 invert"
                />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {t.appName}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-1">
                  {t.appSubtitle}
                </CardDescription>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h2 className="text-lg font-semibold text-foreground">
                {t.createYourAccount}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t.registerTitle}
              </p>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <motion.div {...fieldAnimation(0.35)} className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t.name}
                </Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
                    className={`ps-10 h-11 ${localErrors.name ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {localErrors.name && (
                  <p className="text-xs text-destructive mt-1">{localErrors.name}</p>
                )}
              </motion.div>

              {/* Email Field */}
              <motion.div {...fieldAnimation(0.4)} className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t.email}
                </Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    className={`ps-10 h-11 ${localErrors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    disabled={isLoading}
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
                {localErrors.email && (
                  <p className="text-xs text-destructive mt-1">{localErrors.email}</p>
                )}
              </motion.div>

              {/* Password Field */}
              <motion.div {...fieldAnimation(0.45)} className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t.password}
                </Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    className={`ps-10 pe-10 h-11 ${localErrors.password ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    disabled={isLoading}
                    dir="ltr"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {localErrors.password && (
                  <p className="text-xs text-destructive mt-1">{localErrors.password}</p>
                )}
              </motion.div>

              {/* Confirm Password Field */}
              <motion.div {...fieldAnimation(0.5)} className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t.confirmPassword}
                </Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                    className={`ps-10 pe-10 h-11 ${localErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    disabled={isLoading}
                    dir="ltr"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {localErrors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">{localErrors.confirmPassword}</p>
                )}
              </motion.div>

              {/* Tenant ID Field (optional) */}
              <motion.div {...fieldAnimation(0.55)} className="space-y-2">
                <Label htmlFor="tenantId" className="text-sm font-medium">
                  {language === 'ar' ? 'معرف المؤسسة (اختياري)' : 'Tenant ID (optional)'}
                </Label>
                <div className="relative">
                  <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tenantId"
                    type="text"
                    placeholder={language === 'ar' ? 'أدخل معرف المؤسسة إن وجد' : 'Enter tenant ID if you have one'}
                    value={tenantId}
                    onChange={(e) => { setTenantId(e.target.value); clearFieldError('tenantId'); }}
                    className="ps-10 h-11"
                    disabled={isLoading}
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar'
                    ? 'اتركه فارغاً لإنشاء مؤسسة جديدة تلقائياً'
                    : 'Leave empty to automatically create a new organization'}
                </p>
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Register Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.creatingAccount}
                    </>
                  ) : (
                    t.register
                  )}
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t.orContinueWith}
                  </span>
                </div>
              </div>

              {/* Login Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65, duration: 0.3 }}
                className="text-center text-sm text-muted-foreground"
              >
                {t.hasAccount}{' '}
                <Link
                  href="/login"
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors"
                >
                  {t.loginHere}
                </Link>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="text-center text-xs text-muted-foreground/70 mt-6"
        >
          &copy; {new Date().getFullYear()} {t.appName}. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
        </motion.p>
      </motion.div>
    </div>
  );
}
