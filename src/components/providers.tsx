'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useAuthStore, useAppSettings } from '@/lib/store';
import { api } from '@/lib/api';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function AuthInitializer() {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const setUser = useAuthStore((s) => s.user);
  const setIsAuth = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (api.isAuthenticated && !setUser) {
      fetchUser();
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      useAuthStore.getState().logout();
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
