import { Banknote, Boxes, ChevronLeft, CircleAlert, PackageX, ShoppingBag, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/use-async';
import { apiGet } from '../lib/api';
import { money } from '../lib/utils';
import { Card, PageHeader, StateView } from '../components/ui/core';
import { useAuth } from '../context/auth-context';

type Dashboard = { revenue: number; transactions: number; itemsSold: number; grossProfit: number; lowStock: { name: string; sku: string; available: number; minimumStock: number }[]; outOfStock: { name: string; sku: string; available: number }[]; expiring: number; expired: number };

export function DashboardPage() {
  const state = useAsync(() => apiGet<Dashboard>('/dashboard'), []);
  const { user } = useAuth();
  const stats = state.data ? [
    { label: 'إيرادات اليوم', value: money(state.data.revenue), icon: Banknote, note: 'المبيعات المكتملة' },
    { label: 'المعاملات', value: state.data.transactions, icon: ShoppingBag, note: `${state.data.itemsSold} قطعة مباعة` },
    ...(user?.role === 'ADMIN' ? [{ label: 'إجمالي الربح', value: money(state.data.grossProfit), icon: TrendingUp, note: 'تقديري حسب تكلفة الدفعات' }] : []),
    { label: 'تنبيهات الصلاحية', value: state.data.expiring + state.data.expired, icon: CircleAlert, note: `${state.data.expired} منتهية بالفعل` },
  ] : [];

  return <div className="page-enter">
    <PageHeader title={`مرحبًا، ${user?.name.split(' ')[0]}`} description="إليك أهم ما يحتاج إلى انتباهك اليوم." action={<Link to="/pos" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-blue-600">بدء عملية بيع <ChevronLeft className="size-4" /></Link>} />
    <StateView loading={state.loading} error={state.error} onRetry={state.run}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <Card key={stat.label} className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="ltr-data mt-2 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.note}</p></div><div className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><stat.icon className="size-5" /></div></div></Card>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">مخزون منخفض</h2><p className="text-xs text-muted-foreground">أعد الطلب قبل نفاد الكمية</p></div><Link to="/inventory" className="text-sm font-semibold text-primary">عرض المخزون</Link></div>
          <div className="divide-y divide-border">{state.data?.lowStock.length ? state.data.lowStock.slice(0, 6).map((item) => <div key={item.sku} className="flex items-center gap-4 px-5 py-3"><div className="grid size-9 place-items-center rounded-md bg-amber-50 text-amber-700"><Boxes className="size-4" /></div><div className="min-w-0 flex-1"><p dir="ltr" className="truncate text-left text-sm font-semibold">{item.name}</p><p dir="ltr" className="text-left font-mono text-xs text-muted-foreground">{item.sku}</p></div><div className="text-left"><p className="text-sm font-bold text-amber-700"><bdi>{item.available}</bdi> متبقية</p><p className="text-[11px] text-muted-foreground">الحد الأدنى <bdi>{item.minimumStock}</bdi></p></div></div>) : <div className="p-8 text-center text-sm text-muted-foreground">مستويات المخزون جيدة.</div>}</div>
        </Card>
        <div className="space-y-4">
          <Card className="flex items-center gap-4 p-5"><div className="grid size-11 place-items-center rounded-md bg-red-50 text-red-600"><PackageX className="size-5" /></div><div className="flex-1"><p className="text-sm text-muted-foreground">غير متوفر</p><p className="text-xl font-bold"><bdi>{state.data?.outOfStock.length ?? 0}</bdi> منتج</p></div><Link to="/inventory" className="text-primary"><ChevronLeft className="size-5" /></Link></Card>
          <Card className="p-5"><h3 className="font-semibold">إجراءات سريعة</h3><div className="mt-4 grid grid-cols-2 gap-2"><Link to="/products" className="rounded-md border border-border p-3 text-sm font-medium hover:bg-muted">إضافة منتج</Link><Link to="/purchases" className="rounded-md border border-border p-3 text-sm font-medium hover:bg-muted">استلام مخزون</Link><Link to="/sales" className="rounded-md border border-border p-3 text-sm font-medium hover:bg-muted">البحث عن بيع</Link><Link to="/reports" className="rounded-md border border-border p-3 text-sm font-medium hover:bg-muted">عرض التقارير</Link></div></Card>
        </div>
      </div>
    </StateView>
  </div>;
}
