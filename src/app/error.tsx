'use client';

import { useEffect } from 'react';
import { useAppSettings } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useAppSettings();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-red-950/20">
      <div className="text-center space-y-6 px-4 max-w-md">
        {/* Error Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl shadow-red-500/25">
          <AlertTriangle className="w-10 h-10 text-white" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'حدث خطأ!' : 'Something went wrong!'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar'
              ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
              : 'An unexpected error occurred. Please try again.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={reset}
            className="gap-2 bg-gradient-to-l from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25"
          >
            <RefreshCw className="h-4 w-4" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
        </div>
      </div>
    </div>
  );
}
