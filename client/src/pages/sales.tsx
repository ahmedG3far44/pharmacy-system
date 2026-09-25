import { useState } from 'react';
import { Banknote, PackageCheck, ReceiptText, RotateCcw, Search } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { dateTime, money } from '../lib/utils';
import { Badge, Card, Input, PageHeader, StateView, Table, Td, Th } from '../components/ui/core';
import { cn } from '../lib/utils';
import type { Paged } from '../types';
import { SalesPeriodFilter, type SalesPeriod } from '../components/sales-period-filter';
import { arabicLabel } from '../lib/i18n';

type Sale = { id: string; invoiceNumber: string; status: string; grossTotal: number; netTotal: number; returnedAmount: number; itemsSold: number; createdAt: string; cashier: { name: string }; payments: { method: string }[] };
type SalesResponse = Paged<Sale> & { range: { from: string; to: string }; summary: { transactions: number; grossRevenue: number; refundedAmount: number; netRevenue: number; itemsSold: number; returns: number; averageOrder: number } };

export function SalesPage() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<SalesPeriod>('today');
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().slice(0, 10));
  const state = useAsync(() => apiGet<SalesResponse>(`/sales?limit=100&invoice=${encodeURIComponent(search)}&period=${period}${period === 'specific' ? `&date=${specificDate}` : ''}`), [search, period, specificDate]);
  const summary = state.data?.summary;
  const stats = summary ? [
    { label: 'صافي الإيرادات', value: money(summary.netRevenue), note: `الإجمالي ${money(summary.grossRevenue)}`, icon: Banknote, tone: 'bg-blue-50 text-blue-700' },
    { label: 'المعاملات', value: summary.transactions.toLocaleString('en-EG'), note: `المتوسط ${money(summary.averageOrder)}`, icon: ReceiptText, tone: 'bg-violet-50 text-violet-700' },
    { label: 'القطع المباعة', value: summary.itemsSold.toLocaleString('en-EG'), note: 'بعد خصم الكميات المرتجعة', icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'المبالغ المستردة', value: money(summary.refundedAmount), note: `${summary.returns} عملية إرجاع`, icon: RotateCcw, tone: 'bg-amber-50 text-amber-700' },
  ] : [];

  return <div className="page-enter">
    <PageHeader title="سجل المبيعات" description="صافي المبيعات والأصناف المرتجعة وأداء المعاملات حسب الفترة." />

    <Card className="mb-5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /><Input dir="ltr" className="pr-9 text-right" placeholder="البحث برقم الفاتورة…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <SalesPeriodFilter period={period} date={specificDate} onPeriodChange={setPeriod} onDateChange={setSpecificDate} />
      </div>
    </Card>

    <StateView loading={state.loading} error={state.error} onRetry={state.run}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <Card key={stat.label} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="ltr-data mt-2 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.note}</p></div><div className={cn('grid size-10 shrink-0 place-items-center rounded-md', stat.tone)}><stat.icon className="size-5" /></div></div></Card>)}
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-foreground">المعاملات</h2><p className="mt-0.5 text-xs text-muted-foreground"><bdi>{state.data?.pagination.total ?? 0}</bdi> عملية بيع في الفترة المحددة</p></div></div>
        <StateView empty={!state.data?.items.length}>
          <Table><thead><tr><Th>الفاتورة</Th><Th>التاريخ</Th><Th>أمين الصندوق</Th><Th>صافي القطع</Th><Th>الدفع</Th><Th>الحالة</Th><Th>صافي الإجمالي</Th></tr></thead><tbody>{state.data?.items.map((sale) => <tr key={sale.id}><Td className="font-mono font-semibold text-foreground">{sale.invoiceNumber}</Td><Td>{dateTime(sale.createdAt)}</Td><Td>{sale.cashier.name}</Td><Td><bdi>{sale.itemsSold}</bdi></Td><Td>{arabicLabel(sale.payments[0]?.method)}</Td><Td><Badge tone={sale.status === 'COMPLETED' ? 'green' : sale.status === 'VOIDED' ? 'red' : 'amber'}>{arabicLabel(sale.status)}</Badge></Td><Td><div className="ltr-data font-bold text-foreground">{money(sale.netTotal)}</div>{sale.returnedAmount > 0 && <div className="mt-0.5 text-xs"><span className="ltr-data text-muted-foreground line-through">{money(sale.grossTotal)}</span><span className="mr-2 font-medium text-amber-700">−<bdi>{money(sale.returnedAmount)}</bdi></span></div>}</Td></tr>)}</tbody></Table>
        </StateView>
      </Card>
    </StateView>
  </div>;
}
