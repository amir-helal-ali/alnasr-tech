'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppSettings, useAuthStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  UserCog,
  Building2,
  FileCheck,
  ClipboardList,
  BarChart3,
  Settings,
  UserCircle,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Moon,
  Sun,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';

const navItems = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'customers', href: '/customers', icon: Users },
  { key: 'invoices', href: '/invoices', icon: FileText },
  { key: 'payments', href: '/payments', icon: CreditCard },
  { key: 'einvoicing', href: '/einvoicing', icon: FileCheck },
  { key: 'users', href: '/users', icon: UserCog },
  { key: 'tenants', href: '/tenants', icon: Building2 },
  { key: 'audit', href: '/audit', icon: ClipboardList },
  { key: 'analytics', href: '/analytics', icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { language, sidebarOpen, toggleSidebar, setLanguage } = useAppSettings();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <aside
      className={cn(
        'fixed top-0 h-screen bg-card border-l border-border z-40 transition-all duration-300 flex flex-col shadow-sm',
        isRtl ? 'right-0' : 'left-0',
        sidebarOpen ? 'w-64' : 'w-[70px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">نت</span>
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-foreground text-base leading-tight">{t.appName}</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">{t.appSubtitle}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('mr-auto h-8 w-8 flex-shrink-0', !sidebarOpen && 'hidden')}
          onClick={toggleSidebar}
        >
          {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  !sidebarOpen && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{t[item.key as keyof typeof t]}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-border p-2 space-y-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full justify-start gap-3', !sidebarOpen && 'justify-center px-2')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {sidebarOpen && <span>{theme === 'dark' ? t.light : t.dark}</span>}
        </Button>

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full justify-start gap-3', !sidebarOpen && 'justify-center px-2')}
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        >
          <Languages className="h-4 w-4" />
          {sidebarOpen && <span>{language === 'ar' ? 'English' : 'العربية'}</span>}
        </Button>

        <Separator />

        {/* User menu */}
        <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full justify-start gap-3', !sidebarOpen && 'justify-center px-2')}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user?.name?.charAt(0) || 'م'}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="text-start overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.name || 'مستخدم'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.role || 'admin'}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRtl ? 'start' : 'end'} className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t.settings}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 ml-2" />
              {t.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Toggle when collapsed */}
      {!sidebarOpen && (
        <div className="absolute top-[72px] start-0">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full -translate-x-1/2 bg-card shadow-sm"
            onClick={toggleSidebar}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        </div>
      )}
    </aside>
  );
}
