'use client';

import { useAppSettings, useAuthStore } from '@/lib/store';
import { AppSidebar } from '@/components/app-sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, language } = useAppSettings();
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isRtl = language === 'ar';

  // Don't show sidebar on auth pages
  if (!isAuthenticated || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          isRtl
            ? sidebarOpen ? 'mr-64' : 'mr-[70px]'
            : sidebarOpen ? 'ml-64' : 'ml-[70px]'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
