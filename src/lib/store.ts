import { create } from 'zustand';
import { api, type User } from './api';

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
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل التسجيل', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    api.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },

  fetchUser: async () => {
    if (!api.isAuthenticated) return;
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearTokens();
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
  setLanguage: (language) => set({ language }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
