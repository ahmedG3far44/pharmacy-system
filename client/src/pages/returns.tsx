import { useState } from 'react';
import { Search } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { dateTime, money } from '../lib/utils';
import { Badge, Card, Field, Input, PageHeader, StateView, Table, Td, Textarea, Th } from '../components/ui/core';
import { Button } from '../components/ui/button';
import type { Paged } from '../types';

type ReturnRow = { id: string; returnNumber: string; reason: string; refundAmount: string; createdAt: string; sale: { invoiceNumber: string }; createdBy: { name: string } };
type SaleSummary = { id: string; invoiceNumber: string; grossTotal: number; netTotal: number; returnedAmount: number; createdAt: string };
type SaleDetail = SaleSummary & { total: string; items: { id: string; productId: string; productNameSnapshot: string; quantity: number; unitPrice: string; subtotal: string; returnItems: { quantity: number }[] }[] };

export function ReturnsPage() {
  const [invoice, setInvoice] = useState('');
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restocked, setRestocked] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const history = useAsync(() => apiGet<ReturnRow[]>('/returns'), []);

  const find = async () => {
    setMessage(''); setSuccess(false);
    try {
      const list = await apiGet<Paged<SaleSummary>>(`/sales?invoice=${encodeURIComponent(invoice)}&period=all&limit=1`);
      if (!list.items[0]) throw new Error('لا توجد عملية بيع مطابقة لهذه الفاتورة.');
      const detail = await apiGet<SaleDetail>(`/sales/${list.items[0].id}`);
      setSale(detail);
      setRestocked(Object.fromEntries(detail.items.map((item) => [item.id, true])));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'لم يتم العثور على عملية البيع.'); }
  };

  const create = async () => {
    const items = sale!.items.filter((item) => (quantities[item.id] ?? 0) > 0).map((item) => ({ saleItemId: item.id, quantity: quantities[item.id], restocked: restocked[item.id] ?? true }));
    try {
      await apiPost('/returns', { saleId: sale!.id, reason, items });
      setSale(null); setInvoice(''); setQuantities({}); setRestocked({}); setReason(''); setSuccess(true);
      setMessage('تم إكمال المرتجع وتحديث المخزون وصافي المبيعات.');
      await history.run();
    } catch (error) { setSuccess(false); setMessage(error instanceof Error ? error.message : 'تعذر إكمال المرتجع.'); }
  };

  return <div className="page-enter">
    <PageHeader title="المرتجعات" description="ارجع إلى عملية البيع الأصلية وتحقق من الكميات وسجّل المبلغ المسترد." />
    <Card className="mb-6 p-5">
      <h2 className="font-semibold">تنفيذ مرتجع</h2>
      <div className="mt-4 flex max-w-lg gap-2"><Input dir="ltr" className="text-right" placeholder="رقم الفاتورة، مثال SAL-2026-000001" value={invoice} onChange={(event) => setInvoice(event.target.value)} /><Button onClick={() => void find()} disabled={!invoice}><Search className="size-4" /> بحث</Button></div>
      {message && <p className={`mt-3 text-sm ${success ? 'text-emerald-700' : 'text-red-600'}`}>{message}</p>}
      {sale && <div className="mt-6 border-t border-border pt-5">
        <div className="mb-4 flex items-center justify-between"><div><strong className="font-mono">{sale.invoiceNumber}</strong><p className="text-xs text-muted-foreground">{dateTime(sale.createdAt)}</p></div><div className="text-left"><strong className="ltr-data">{money(sale.netTotal)}</strong>{sale.returnedAmount > 0 && <p className="text-xs text-muted-foreground">تم رد <bdi>{money(sale.returnedAmount)}</bdi> سابقًا</p>}</div></div>
        <div className="space-y-2">{sale.items.map((item) => { const returned = item.returnItems.reduce((sum, value) => sum + value.quantity, 0); const max = item.quantity - returned; return <div key={item.id} className="grid items-center gap-3 rounded-md bg-muted p-3 sm:grid-cols-[1fr_100px_160px]"><div><p dir="ltr" className="text-left text-sm font-semibold">{item.productNameSnapshot}</p><p className="text-xs text-muted-foreground">مبيع <bdi>{item.quantity}</bdi> · متاح للإرجاع <bdi>{max}</bdi> · استرداد <bdi>{money(Number(item.subtotal) / item.quantity)}</bdi> للقطعة</p></div><Input type="number" min="0" max={max} value={quantities[item.id] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={restocked[item.id] ?? true} onChange={(event) => setRestocked((current) => ({ ...current, [item.id]: event.target.checked }))} /> إعادة إلى المخزون</label></div>; })}</div>
        <div className="mt-4"><Field label="السبب"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب الإرجاع مطلوب" /></Field></div>
        <Button className="mt-4" variant="danger" disabled={!reason.trim() || !Object.values(quantities).some((value) => value > 0)} onClick={() => void create()}>تأكيد استرداد المبلغ</Button>
      </div>}
    </Card>
    <Card><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">سجل المرتجعات</h2></div><StateView loading={history.loading} error={history.error} empty={!history.data?.length} onRetry={history.run}><Table><thead><tr><Th>المرتجع</Th><Th>البيع الأصلي</Th><Th>التاريخ</Th><Th>نفذه</Th><Th>السبب</Th><Th>المبلغ المسترد</Th></tr></thead><tbody>{history.data?.map((item) => <tr key={item.id}><Td><Badge tone="purple">{item.returnNumber}</Badge></Td><Td className="font-mono">{item.sale.invoiceNumber}</Td><Td>{dateTime(item.createdAt)}</Td><Td>{item.createdBy.name}</Td><Td>{item.reason}</Td><Td className="ltr-data font-bold text-red-700">{money(item.refundAmount)}</Td></tr>)}</tbody></Table></StateView></Card>
  </div>;
}
