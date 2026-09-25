import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CalendarX, PackageCheck, Search, SlidersHorizontal } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { money, shortDate } from '../lib/utils';
import { Badge, Card, Field, Input, PageHeader, StateView, Table, Td, Textarea, Th } from '../components/ui/core';
import { Button } from '../components/ui/button';
import { WorkspacePanel } from '../components/ui/workspace-panel';
import { Pagination } from '../components/ui/pagination';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/utils';
import type { Paged } from '../types';
import { arabicLabel } from '../lib/i18n';

type Inventory = { id: string; name: string; sku: string; availableQuantity: number; minimumStock: number; stockValue: number; stockStatus: string; category: { name: string } };
type Batch = { id: string; batchNumber: string; availableQuantity: number; expiryDate: string; status: string; product: { name: string; sku: string } };
type AdjustmentType = 'ADD' | 'REMOVE' | 'DAMAGED' | 'EXPIRED';

const adjustmentOptions: { value: AdjustmentType; label: string; description: string; icon: typeof ArrowUp; tone: string }[] = [
  { value: 'ADD', label: 'إضافة مخزون', description: 'جرد أو تصحيح للكمية', icon: ArrowUp, tone: 'text-emerald-700 bg-emerald-50' },
  { value: 'REMOVE', label: 'خصم مخزون', description: 'تصحيح يدوي للمخزون', icon: ArrowDown, tone: 'text-amber-700 bg-amber-50' },
  { value: 'DAMAGED', label: 'تالف', description: 'إخراج من المخزون القابل للبيع', icon: AlertTriangle, tone: 'text-red-700 bg-red-50' },
  { value: 'EXPIRED', label: 'منتهي الصلاحية', description: 'عزل دفعة منتهية', icon: CalendarX, tone: 'text-purple-700 bg-purple-50' },
];

export function InventoryPage() {
  const [tab, setTab] = useState<'summary' | 'batches'>('summary');
  const [adjust, setAdjust] = useState<Batch | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [summaryPage, setSummaryPage] = useState(1);
  const [batchPage, setBatchPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const search = useDebouncedValue(searchInput);
  const { can, user } = useAuth();
  const summary = useAsync(() => apiGet<Paged<Inventory>>(`/inventory/summary?page=${summaryPage}&limit=${limit}&search=${encodeURIComponent(search)}`), [summaryPage, limit, search]);
  const batches = useAsync(() => apiGet<Paged<Batch>>(`/inventory/batches?page=${batchPage}&limit=${limit}&search=${encodeURIComponent(search)}`), [batchPage, limit, search]);

  const refresh = async () => { await Promise.all([summary.run(), batches.run()]); };
  const closePanel = () => setAdjust(null);

  return <div className="page-enter">
    <PageHeader title="المخزون" description="كميات الدفعات والصلاحية وقيمة المخزون." />

    <div className="mb-4 flex w-fit gap-1 rounded-md bg-secondary p-1">
      <button className={cn('rounded px-4 py-2 text-sm font-semibold transition-colors', tab === 'summary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')} onClick={() => setTab('summary')}>ملخص المخزون</button>
      {user?.role !== 'CASHIER' && <button className={cn('rounded px-4 py-2 text-sm font-semibold transition-colors', tab === 'batches' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')} onClick={() => setTab('batches')}>الدفعات</button>}
    </div>

    <Card>
      <div className="border-b border-border p-4"><div className="relative max-w-md"><Search className="absolute right-3 top-3 size-4 text-muted-foreground" /><Input className="pr-9" placeholder={tab === 'summary' ? 'البحث باسم المنتج أو الباركود أو SKU' : 'البحث بالمنتج أو رقم الدفعة'} value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setSummaryPage(1); setBatchPage(1); }} /></div></div>
      <StateView loading={tab === 'summary' ? summary.loading : batches.loading} error={tab === 'summary' ? summary.error : batches.error} empty={tab === 'summary' ? !summary.data?.items.length : !batches.data?.items.length} onRetry={tab === 'summary' ? summary.run : batches.run}>
        <>{tab === 'summary' ? <Table>
          <thead><tr><Th>المنتج</Th><Th>التصنيف</Th><Th>المتاح</Th>{user?.role !== 'CASHIER' && <Th>قيمة المخزون</Th>}<Th>الحالة</Th></tr></thead>
          <tbody>{summary.data?.items.map((item) => <tr key={item.id}><Td><strong dir="ltr" className="block text-left text-foreground">{item.name}</strong><div dir="ltr" className="text-left font-mono text-xs text-muted-foreground">{item.sku}</div></Td><Td dir="ltr" className="text-left">{item.category.name}</Td><Td className="font-bold text-foreground"><bdi>{item.availableQuantity}</bdi></Td>{user?.role !== 'CASHIER' && <Td className="ltr-data">{money(item.stockValue)}</Td>}<Td><Badge tone={item.stockStatus === 'OUT_OF_STOCK' ? 'red' : item.stockStatus === 'LOW_STOCK' ? 'amber' : 'green'}>{arabicLabel(item.stockStatus)}</Badge></Td></tr>)}</tbody>
        </Table> : <Table>
          <thead><tr><Th>المنتج</Th><Th>الدفعة</Th><Th>المتاح</Th><Th>الصلاحية</Th><Th>الحالة</Th><Th></Th></tr></thead>
          <tbody>{batches.data?.items.map((batch) => <tr key={batch.id}><Td><strong dir="ltr" className="block text-left text-foreground">{batch.product.name}</strong><div dir="ltr" className="text-left font-mono text-xs text-muted-foreground">{batch.product.sku}</div></Td><Td><span className="font-mono text-xs">{batch.batchNumber}</span></Td><Td className="font-bold text-foreground"><bdi>{batch.availableQuantity}</bdi></Td><Td>{shortDate(batch.expiryDate)}</Td><Td><Badge tone={batch.status === 'ACTIVE' ? 'green' : batch.status === 'DEPLETED' ? 'slate' : 'red'}>{arabicLabel(batch.status)}</Badge></Td><Td>{can('inventory:adjust') && <Button size="sm" variant="outline" onClick={() => setAdjust(batch)}><SlidersHorizontal className="size-3.5" /> تعديل</Button>}</Td></tr>)}</tbody>
        </Table>}
        {tab === 'summary' && summary.data && <Pagination pagination={summary.data.pagination} onPageChange={setSummaryPage} onLimitChange={(nextLimit) => { setLimit(nextLimit); setSummaryPage(1); setBatchPage(1); }} />}
        {tab === 'batches' && batches.data && <Pagination pagination={batches.data.pagination} onPageChange={setBatchPage} onLimitChange={(nextLimit) => { setLimit(nextLimit); setSummaryPage(1); setBatchPage(1); }} />}</>
      </StateView>
    </Card>

    {adjust && <AdjustmentPanel batch={adjust} onClose={closePanel} onSaved={refresh} />}
  </div>;
}

function AdjustmentPanel({ batch, onClose, onSaved }: { batch: Batch; onClose: () => void; onSaved: () => Promise<void> }) {
  const [type, setType] = useState<AdjustmentType>('ADD');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const numericQuantity = Math.max(0, Number(quantity) || 0);
  const isAddition = type === 'ADD';
  const resultingQuantity = isAddition ? batch.availableQuantity + numericQuantity : batch.availableQuantity - numericQuantity;
  const invalidRemoval = !isAddition && numericQuantity > batch.availableQuantity;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!numericQuantity || invalidRemoval) return;
    setSaving(true); setMessage('');
    try {
      await apiPost('/inventory/adjust', {
        batchId: batch.id,
        delta: isAddition ? numericQuantity : -numericQuantity,
        reason: reason.trim(),
        kind: type === 'DAMAGED' || type === 'EXPIRED' ? type : undefined,
      });
      await onSaved(); onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'فشل تعديل المخزون.');
    } finally { setSaving(false); }
  };

  const footer = <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
    <Button type="submit" form="inventory-adjustment-form" disabled={saving || !numericQuantity || !reason.trim() || invalidRemoval}>{saving ? 'جارٍ حفظ التعديل…' : 'حفظ التعديل'}</Button>
  </div>;

  return <WorkspacePanel open onOpenChange={(open) => { if (!open) onClose(); }} eyebrow="التحكم في المخزون" title="تعديل كمية الدفعة" description="يتم تسجيل كل تغيير في سجل حركات المخزون الدائم." footer={footer}>
    <form id="inventory-adjustment-form" onSubmit={submit} className="space-y-7">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
        <div className="bg-muted p-4"><p className="text-xs font-medium text-muted-foreground">رقم الدفعة</p><p className="mt-1 truncate font-mono text-sm font-semibold text-foreground">{batch.batchNumber}</p></div>
        <div className="bg-muted p-4"><p className="text-xs font-medium text-muted-foreground">المخزون الحالي</p><p className="mt-1 text-sm font-semibold text-foreground"><bdi>{batch.availableQuantity}</bdi> وحدة</p></div>
        <div className="bg-muted p-4"><p className="text-xs font-medium text-muted-foreground">SKU</p><p className="mt-1 font-mono text-sm font-semibold text-foreground">{batch.product.sku}</p></div>
        <div className="bg-muted p-4"><p className="text-xs font-medium text-muted-foreground">تاريخ الصلاحية</p><p className="mt-1 text-sm font-semibold text-foreground">{shortDate(batch.expiryDate)}</p></div>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-foreground">نوع التعديل</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {adjustmentOptions.map((option) => <button key={option.value} type="button" aria-pressed={type === option.value} onClick={() => { setType(option.value); setMessage(''); }} className={cn('flex items-start gap-3 rounded-md border bg-background p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring', type === option.value ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted')}>
            <span className={cn('grid size-8 shrink-0 place-items-center rounded', option.tone)}><option.icon className="size-4" /></span>
            <span><span className="block text-sm font-semibold text-foreground">{option.label}</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{option.description}</span></span>
          </button>)}
        </div>
      </fieldset>

      <Field label="الكمية">
        <div className="relative"><Input className="h-12 pl-16 text-base font-semibold" value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" inputMode="numeric" min="1" step="1" placeholder="0" autoFocus required /><span className="pointer-events-none absolute left-3 top-3.5 text-sm text-muted-foreground">وحدة</span></div>
        {invalidRemoval && <p className="mt-2 text-xs font-medium text-destructive">لا يمكن أن تتجاوز الكمية <bdi>{batch.availableQuantity}</bdi> وحدة متاحة حاليًا.</p>}
      </Field>

      <div className="flex items-center justify-between rounded-md border border-border bg-accent/40 px-4 py-3">
        <div><p className="text-xs font-medium text-muted-foreground">المخزون الناتج</p><p className="mt-0.5 text-sm text-accent-foreground">بعد تنفيذ هذا التعديل</p></div>
        <div className="flex items-center gap-2 text-lg font-bold text-foreground"><span>{batch.availableQuantity}</span><span className="text-muted-foreground">→</span><span className={invalidRemoval ? 'text-destructive' : 'text-primary'}>{resultingQuantity}</span></div>
      </div>

      <Field label="سبب التعديل">
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} rows={4} placeholder="وضّح سبب الحاجة إلى تغيير المخزون…" />
        <p className="mt-2 text-xs text-muted-foreground">ستظهر هذه الملاحظة في سجل التدقيق وحركات المخزون.</p>
      </Field>

      {message && <div role="alert" className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div>}
      <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><PackageCheck className="size-4 shrink-0" />سيتم تحديث كمية الدفعة وحركة المخزون معًا.</div>
    </form>
  </WorkspacePanel>;
}
