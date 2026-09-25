import { useState } from 'react';
import { Banknote, BarChart3, CreditCard, ReceiptText } from 'lucide-react';
import { SalesPeriodFilter, type SalesPeriod } from '../components/sales-period-filter';
import { Card, PageHeader, StateView, Table, Td, Th } from '../components/ui/core';
import { apiGet } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { money } from '../lib/utils';
import { arabicLabel } from '../lib/i18n';

type Report = {
  sales: { revenue: number; grossRevenue: number; refundedAmount: number; transactions: number; averageOrder: number };
  purchases: { total: number; count: number };
  payments: { method: string; _sum: { amount: string }; _count: number }[];
  topProducts: { productId: string; productNameSnapshot: string; _sum: { quantity: number; subtotal: number } }[];
};

export function ReportsPage() {
  const [period, setPeriod] = useState<SalesPeriod>('month');
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().slice(0, 10));
  const state = useAsync(() => apiGet<Report>(`/reports/summary?period=${period}${period === 'specific' ? `&date=${specificDate}` : ''}`), [period, specificDate]);
  const stats = state.data ? [
    { label: 'صافي إيرادات المبيعات', value: money(state.data.sales.revenue), note: `مسترد ${money(state.data.sales.refundedAmount)}`, icon: Banknote },
    { label: 'المعاملات', value: state.data.sales.transactions.toLocaleString('en-EG'), note: `الإجمالي ${money(state.data.sales.grossRevenue)}`, icon: ReceiptText },
    { label: 'متوسط الطلب', value: money(state.data.sales.averageOrder), note: 'بعد المرتجعات', icon: BarChart3 },
    { label: 'المشتريات', value: money(state.data.purchases.total), note: `${state.data.purchases.count} مستلمة`, icon: CreditCard },
  ] : [];

  return <div className="page-enter">
    <PageHeader title="التقارير" description="المبيعات وأداء المنتجات والمدفوعات والمشتريات." action={<SalesPeriodFilter period={period} date={specificDate} onPeriodChange={setPeriod} onDateChange={setSpecificDate} />} />
    <StateView loading={state.loading} error={state.error} onRetry={state.run}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <Card key={stat.label} className="p-5"><div className="flex justify-between gap-4"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="ltr-data mt-2 text-2xl font-bold text-foreground">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.note}</p></div><div className="grid size-10 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><stat.icon className="size-5" /></div></div></Card>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">أفضل المنتجات</h2><p className="mt-0.5 text-xs text-muted-foreground">بعد خصم الكميات والمبالغ المرتجعة</p></div><StateView empty={!state.data?.topProducts.length}><Table><thead><tr><Th>المنتج</Th><Th>الوحدات</Th><Th>الإيرادات</Th></tr></thead><tbody>{state.data?.topProducts.map((product) => <tr key={product.productId}><Td dir="ltr" className="text-left font-semibold text-foreground">{product.productNameSnapshot}</Td><Td><bdi>{product._sum.quantity}</bdi></Td><Td className="ltr-data">{money(product._sum.subtotal)}</Td></tr>)}</tbody></Table></StateView></Card>
        <Card><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">توزيع طرق الدفع</h2></div><StateView empty={!state.data?.payments.length}><div className="space-y-3 p-5">{state.data?.payments.map((payment) => <div key={payment.method} className="flex items-center justify-between rounded-md bg-muted p-4"><div><p className="font-semibold text-foreground">{arabicLabel(payment.method)}</p><p className="text-xs text-muted-foreground"><bdi>{payment._count}</bdi> دفعة</p></div><strong className="ltr-data">{money(payment._sum.amount)}</strong></div>)}</div></StateView></Card>
      </div>
    </StateView>
  </div>;
}
