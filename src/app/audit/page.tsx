'use client';

import { useAppSettings } from '@/lib/store';
import { translations } from '@/lib/i18n';
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
} from 'lucide-react';
import { useState } from 'react';

// Action type config
const actionConfig = {
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

type ActionType = keyof typeof actionConfig;

const entityLabels: Record<string, { ar: string; en: string }> = {
  invoice: { ar: 'فاتورة', en: 'Invoice' },
  customer: { ar: 'عميل', en: 'Customer' },
  payment: { ar: 'دفعة', en: 'Payment' },
  user: { ar: 'مستخدم', en: 'User' },
};

// Mock audit log entries
const mockAuditLogs = [
  {
    id: '1',
    timestamp: '2026-06-14T10:30:00Z',
    user: 'أحمد محمد',
    action: 'create' as ActionType,
    entity: 'invoice',
    entityId: 'INV-20260614-001',
    details: {
      description: 'إنشاء فاتورة جديدة لشركة النيل للتجارة',
      changes: { customer: 'شركة النيل للتجارة', amount: 15750, status: 'صادرة' },
    },
    ipAddress: '192.168.1.105',
  },
  {
    id: '2',
    timestamp: '2026-06-14T10:15:00Z',
    user: 'أحمد محمد',
    action: 'login' as ActionType,
    entity: 'user',
    entityId: 'USR-001',
    details: {
      description: 'تسجيل دخول ناجح',
      browser: 'Chrome 126',
      os: 'Windows 11',
    },
    ipAddress: '192.168.1.105',
  },
  {
    id: '3',
    timestamp: '2026-06-14T09:45:00Z',
    user: 'سارة أحمد',
    action: 'update' as ActionType,
    entity: 'customer',
    entityId: 'CUS-042',
    details: {
      description: 'تحديث بيانات العميل',
      changes: { phone: '01098765432', address: '١٥ شارع المعادي، القاهرة' },
    },
    ipAddress: '192.168.1.112',
  },
  {
    id: '4',
    timestamp: '2026-06-14T09:30:00Z',
    user: 'محمد علي',
    action: 'delete' as ActionType,
    entity: 'invoice',
    entityId: 'INV-20260610-015',
    details: {
      description: 'حذف فاتورة ملغاة',
      reason: 'فاتورة مكررة تم إنشاؤها بالخطأ',
    },
    ipAddress: '192.168.1.108',
  },
  {
    id: '5',
    timestamp: '2026-06-13T16:20:00Z',
    user: 'سارة أحمد',
    action: 'create' as ActionType,
    entity: 'payment',
    entityId: 'PAY-20260613-003',
    details: {
      description: 'تسجيل دفعة نقدية',
      changes: { amount: 8200, method: 'نقدي', invoiceId: 'INV-20260614-002' },
    },
    ipAddress: '192.168.1.112',
  },
  {
    id: '6',
    timestamp: '2026-06-13T15:10:00Z',
    user: 'أحمد محمد',
    action: 'update' as ActionType,
    entity: 'invoice',
    entityId: 'INV-20260613-003',
    details: {
      description: 'تحديث حالة الفاتورة من مسودة إلى صادرة',
      changes: { status: { from: 'مسودة', to: 'صادرة' } },
    },
    ipAddress: '192.168.1.105',
  },
  {
    id: '7',
    timestamp: '2026-06-13T14:00:00Z',
    user: 'خالد حسن',
    action: 'login' as ActionType,
    entity: 'user',
    entityId: 'USR-003',
    details: {
      description: 'تسجيل دخول ناجح',
      browser: 'Firefox 127',
      os: 'macOS 15',
    },
    ipAddress: '10.0.0.55',
  },
  {
    id: '8',
    timestamp: '2026-06-13T11:30:00Z',
    user: 'محمد علي',
    action: 'create' as ActionType,
    entity: 'customer',
    entityId: 'CUS-055',
    details: {
      description: 'إضافة عميل جديد',
      changes: { name: 'مؤسسة النور للتجارة', taxNumber: '300-555-1234', phone: '01123456789' },
    },
    ipAddress: '192.168.1.108',
  },
  {
    id: '9',
    timestamp: '2026-06-12T17:45:00Z',
    user: 'سارة أحمد',
    action: 'delete' as ActionType,
    entity: 'payment',
    entityId: 'PAY-20260610-002',
    details: {
      description: 'حذف دفعة خاطئة',
      reason: 'تم تسجيل الدفعة على فاتورة خاطئة',
    },
    ipAddress: '192.168.1.112',
  },
  {
    id: '10',
    timestamp: '2026-06-12T14:20:00Z',
    user: 'أحمد محمد',
    action: 'update' as ActionType,
    entity: 'user',
    entityId: 'USR-002',
    details: {
      description: 'تحديث دور المستخدم',
      changes: { role: { from: 'مستخدم', to: 'مدير فرعي' } },
    },
    ipAddress: '192.168.1.105',
  },
  {
    id: '11',
    timestamp: '2026-06-12T10:00:00Z',
    user: 'خالد حسن',
    action: 'create' as ActionType,
    entity: 'invoice',
    entityId: 'INV-20260612-005',
    details: {
      description: 'إنشاء فاتورة لشركة الوادي',
      changes: { customer: 'شركة الوادي', amount: 12900, items: 3 },
    },
    ipAddress: '10.0.0.55',
  },
  {
    id: '12',
    timestamp: '2026-06-11T09:15:00Z',
    user: 'محمد علي',
    action: 'login' as ActionType,
    entity: 'user',
    entityId: 'USR-002',
    details: {
      description: 'محاولة تسجيل دخول فاشلة - كلمة مرور خاطئة',
      browser: 'Safari 17',
      os: 'iOS 18',
      failed: true,
    },
    ipAddress: '192.168.1.200',
  },
];

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

const ITEMS_PER_PAGE = 5;

export default function AuditPage() {
  const { language } = useAppSettings();
  const t = translations[language];

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter audit logs
  const filteredLogs = mockAuditLogs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (entityFilter !== 'all' && log.entity !== entityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.user.includes(query) ||
        log.entityId.toLowerCase().includes(query) ||
        log.ipAddress.includes(query) ||
        log.details.description.includes(query)
      );
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
            {filteredLogs.length} {language === 'ar' ? 'سجل' : 'entries'}
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
                  {paginatedLogs.map((log) => {
                    const action = actionConfig[log.action];
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
                            {formatTimestamp(log.timestamp, language)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{log.user}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${action.className}`}>
                              <ActionIcon className="h-3 w-3" />
                              {action.label[language]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {entityLabels[log.entity]?.[language] || log.entity}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.entityId}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {log.details.description}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.ipAddress}
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
                                  {JSON.stringify(log.details, null, 2)}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar'
                    ? `عرض ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} - ${Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} من ${filteredLogs.length}`
                    : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} - ${Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of ${filteredLogs.length}`}
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
