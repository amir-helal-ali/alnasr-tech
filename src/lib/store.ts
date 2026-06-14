import { create } from 'zustand';
import { api, type User } from './api';

// Cookie helpers
function setCookie(name: string, value: string, days: number = 30) {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }
}

function deleteCookie(name: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, tenant_name: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(email, password);
      // Set auth cookie for middleware
      setCookie('auth_token', data.access_token, 30);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تسجيل الدخول', isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, tenant_name) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register(name, email, password, tenant_name);
      // Set auth cookie for middleware
      setCookie('auth_token', data.access_token, 30);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل التسجيل', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    api.logout();
    deleteCookie('auth_token');
    set({ user: null, isAuthenticated: false, error: null });
  },

  fetchUser: async () => {
    if (!api.isAuthenticated) return;
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      // Ensure cookie is set
      const token = localStorage.getItem('access_token');
      if (token) setCookie('auth_token', token, 30);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearTokens();
      deleteCookie('auth_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

interface AppSettings {
  language: 'ar' | 'en';
  sidebarOpen: boolean;
  setLanguage: (lang: 'ar' | 'en') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppSettings = create<AppSettings>((set) => ({
  language: 'ar',
  sidebarOpen: true,
  setLanguage: (language) => {
    set({ language });
    // Update document dir and lang
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
