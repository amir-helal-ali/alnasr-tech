'use client';

import Link from 'next/link';
import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const { language } = useAppSettings();
  const t = translations[language];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      <div className="text-center space-y-6 px-4">
        {/* 404 Number */}
        <div className="relative">
          <h1 className="text-[150px] font-bold text-emerald-100 dark:text-emerald-900/30 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {language === 'ar'
              ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
              : 'Sorry, the page you are looking for does not exist or has been moved.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            className="gap-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'ar' ? 'رجوع' : 'Go Back'}
          </Button>
          <Link href="/">
            <Button className="gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25">
              <Home className="h-4 w-4" />
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
