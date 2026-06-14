'use client';

import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { api, AuditLog } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  ClipboardList,
  PlusCircle,
  Pencil,
  Trash2,
  LogIn,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// Action type config
const actionConfig: Record<string, {
  label: { ar: string; en: string };
  icon: typeof PlusCircle;
  className: string;
}> = {
  create: {
    label: { ar: 'إنشاء', en: 'Create' },
    icon: PlusCircle,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  update: {
    label: { ar: 'تحديث', en: 'Update' },
    icon: Pencil,
    className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  },
  delete: {
    label: { ar: 'حذف', en: 'Delete' },
    icon: Trash2,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
  login: {
    label: { ar: 'تسجيل دخول', en: 'Login' },
    icon: LogIn,
    className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  },
};

const defaultActionConfig = {
  label: { ar: 'إجراء', en: 'Action' },
  icon: ClipboardList,
  className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
};

const entityLabels: Record<string, { ar: string; en: string }> = {
  invoice: { ar: 'فاتورة', en: 'Invoice' },
  customer: { ar: 'عميل', en: 'Customer' },
  payment: { ar: 'دفعة', en: 'Payment' },
  user: { ar: 'مستخدم', en: 'User' },
  tenant: { ar: 'مؤسسة', en: 'Tenant' },
};

function formatTimestamp(dateStr: string, language: 'ar' | 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const ITEMS_PER_PAGE = 10;

export default function AuditPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Build query params from filters
  const queryParams = useMemo(() => ({
    page: currentPage,
    per_page: ITEMS_PER_PAGE,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entity_type: entityFilter !== 'all' ? entityFilter : undefined,
  }), [currentPage, actionFilter, entityFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', queryParams],
    queryFn: () => api.getAuditLogs(queryParams),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const resetFilters = () => {
    setActionFilter('all');
    setEntityFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = actionFilter !== 'all' || entityFilter !== 'all' || searchQuery !== '';

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.audit}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'ar'
                ? 'تتبع جميع الأنشطة والتغييرات في النظام'
                : 'Track all activities and changes in the system'}
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
            <ClipboardList className="h-4 w-4 text-primary" />
            {total} {language === 'ar' ? 'سجل' : 'entries'}
          </Badge>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{t.filter}:</span>
              </div>

              {/* Action Type Filter */}
              <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={language === 'ar' ? 'نوع الإجراء' : 'Action Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الإجراءات' : 'All Actions'}</SelectItem>
                  <SelectItem value="create">{language === 'ar' ? 'إنشاء' : 'Create'}</SelectItem>
                  <SelectItem value="update">{language === 'ar' ? 'تحديث' : 'Update'}</SelectItem>
                  <SelectItem value="delete">{language === 'ar' ? 'حذف' : 'Delete'}</SelectItem>
                  <SelectItem value="login">{language === 'ar' ? 'تسجيل دخول' : 'Login'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Entity Type Filter */}
              <Select value={entityFilter} onValueChange={(val) => { setEntityFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={language === 'ar' ? 'نوع الكيان' : 'Entity Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الكيانات' : 'All Entities'}</SelectItem>
                  <SelectItem value="invoice">{language === 'ar' ? 'فاتورة' : 'Invoice'}</SelectItem>
                  <SelectItem value="customer">{language === 'ar' ? 'عميل' : 'Customer'}</SelectItem>
                  <SelectItem value="payment">{language === 'ar' ? 'دفعة' : 'Payment'}</SelectItem>
                  <SelectItem value="user">{language === 'ar' ? 'مستخدم' : 'User'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث في السجلات...' : 'Search logs...'}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pr-9"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs">
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ms-3 text-muted-foreground">
                  {language === 'ar' ? 'جاري تحميل السجلات...' : 'Loading logs...'}
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {language === 'ar' ? 'فشل تحميل السجلات' : 'Failed to load audit logs'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد سجلات' : 'No audit logs found'}
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>{t.timestamp}</TableHead>
                      <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                      <TableHead>{t.action}</TableHead>
                      <TableHead>{t.entity}</TableHead>
                      <TableHead>{t.entityId}</TableHead>
                      <TableHead>{language === 'ar' ? 'التفاصيل' : 'Details'}</TableHead>
                      <TableHead>{t.ipAddress}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: AuditLog) => {
                      const action = actionConfig[log.action] || defaultActionConfig;
                      const ActionIcon = action.icon;
                      const isExpanded = expandedRow === log.id;

                      return (
                        <>
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleExpand(log.id)}
                          >
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(log.created_at, language)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {log.user?.name || log.user_id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`gap-1 ${action.className}`}>
                                <ActionIcon className="h-3 w-3" />
                                {action.label[language]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {entityLabels[log.entity_type]?.[language] || log.entity_type}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {log.entity_id}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              {log.details || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {log.ip_address || '—'}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${log.id}-detail`} className="bg-muted/30">
                              <TableCell colSpan={8} className="p-4">
                                <div className="max-w-2xl">
                                  <p className="text-sm font-medium mb-2">
                                    {language === 'ar' ? 'تفاصيل السجل' : 'Log Details'}
                                  </p>
                                  <pre className="bg-muted p-3 rounded-md text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap" dir="ltr">
                                    {JSON.stringify({
                                      id: log.id,
                                      user_id: log.user_id,
                                      action: log.action,
                                      entity_type: log.entity_type,
                                      entity_id: log.entity_id,
                                      details: log.details,
                                      ip_address: log.ip_address,
                                      created_at: log.created_at,
                                    }, null, 2)}
                                  </pre>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar'
                    ? `عرض ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} - ${Math.min(currentPage * ITEMS_PER_PAGE, total)} من ${total}`
                    : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} - ${Math.min(currentPage * ITEMS_PER_PAGE, total)} of ${total}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    {t.previous}
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t.next}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
