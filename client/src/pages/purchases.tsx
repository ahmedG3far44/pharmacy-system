import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Plus } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { money, shortDate } from '../lib/utils';
import type { Paged, Product } from '../types';
import { Badge, Card, Field, Input, PageHeader, Select, StateView, Table, Td, Th } from '../components/ui/core';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/auth-context';
import { arabicLabel } from '../lib/i18n';

type Supplier = { id: string; name: string };
type Purchase = { id: string; purchaseNumber: string; status: string; total: string; purchasedAt: string; supplier: Supplier; _count: { items: number } };
type Notice = { tone: 'success' | 'error'; text: string };

export function PurchasesPage() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const { can } = useAuth();
  const purchases = useAsync(() => apiGet<Paged<Purchase>>('/purchases?limit=100'), []);
  const suppliers = useAsync(() => apiGet<Supplier[]>('/suppliers'), []);
  const products = useAsync(() => apiGet<Paged<Product>>('/products?limit=100'), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const product = products.data?.items.find((item) => item.id === form.get('productId'));
    try {
      await apiPost('/purchases', {
        supplierId: form.get('supplierId'),
        supplierInvoiceNumber: form.get('supplierInvoiceNumber') || undefined,
        items: [{
          productId: form.get('productId'), batchNumber: form.get('batchNumber'), quantity: Number(form.get('quantity')),
          purchasePrice: Number(form.get('purchasePrice')), sellingPrice: Number(form.get('sellingPrice') || product?.sellingPrice),
          expiryDate: form.get('expiryDate'),
        }],
      });
      setOpen(false);
      setNotice({ tone: 'success', text: 'تم إنشاء مسودة الشراء وهي جاهزة للاستلام.' });
      await purchases.run();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'تعذر إنشاء طلب الشراء.' });
    }
  };

  const receive = async (purchase: Purchase) => {
    if (receivingId) return;
    setReceivingId(purchase.id);
    setNotice(null);
    try {
      await apiPost(`/purchases/${purchase.id}/receive`);
      await purchases.run();
      setNotice({ tone: 'success', text: `تم استلام ${purchase.purchaseNumber} وإضافة كمياته إلى المخزون.` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'تعذر استلام طلب الشراء.' });
    } finally {
      setReceivingId(null);
    }
  };

  return <div className="page-enter">
    <PageHeader title="المشتريات" description="أنشئ طلبات الموردين واستلمها ضمن دفعات المخزون." action={can('purchase:create') && <Button onClick={() => { setOpen((current) => !current); setNotice(null); }}><Plus className="size-4" /> طلب شراء جديد</Button>} />

    {notice && <div role="status" aria-live="polite" className={`mb-4 flex items-start gap-3 rounded-md border p-3 text-sm ${notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {notice.tone === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <span>{notice.text}</span>
    </div>}

    {open && <Card className="mb-6 p-5">
      <h2 className="mb-4 font-semibold">إنشاء مسودة شراء</h2>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="المورد"><Select name="supplierId" required><option value="">اختر المورد</option>{suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select></Field>
        <Field label="فاتورة المورد"><Input dir="ltr" name="supplierInvoiceNumber" /></Field>
        <Field label="المنتج"><Select name="productId" required><option value="">اختر المنتج</option>{products.data?.items.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select></Field>
        <Field label="رقم الدفعة"><Input dir="ltr" name="batchNumber" required /></Field>
        <Field label="الكمية"><Input name="quantity" type="number" min="1" required /></Field>
        <Field label="سعر الشراء"><Input name="purchasePrice" type="number" step="0.01" min="0.01" required /></Field>
        <Field label="سعر البيع"><Input name="sellingPrice" type="number" step="0.01" min="0.01" required /></Field>
        <Field label="تاريخ الصلاحية"><Input name="expiryDate" type="date" required /></Field>
        <div className="flex gap-2 md:col-span-2 xl:col-span-4"><Button>إنشاء المسودة</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button></div>
      </form>
    </Card>}

    <Card>
      <StateView loading={purchases.loading} error={purchases.error} empty={!purchases.data?.items.length} onRetry={purchases.run}>
        <Table><thead><tr><Th>طلب الشراء</Th><Th>المورد</Th><Th>التاريخ</Th><Th>الأصناف</Th><Th>الإجمالي</Th><Th>الحالة</Th><Th></Th></tr></thead><tbody>{purchases.data?.items.map((purchase) => <tr key={purchase.id}>
          <Td className="font-mono font-semibold">{purchase.purchaseNumber}</Td><Td>{purchase.supplier.name}</Td><Td>{shortDate(purchase.purchasedAt)}</Td><Td><bdi>{purchase._count.items}</bdi></Td><Td className="ltr-data font-semibold">{money(purchase.total)}</Td>
          <Td><Badge tone={purchase.status === 'RECEIVED' ? 'green' : purchase.status === 'DRAFT' ? 'amber' : 'red'}>{arabicLabel(purchase.status)}</Badge></Td>
          <Td>{purchase.status === 'DRAFT' && can('purchase:receive') && <Button size="sm" disabled={receivingId !== null} onClick={() => void receive(purchase)}>{receivingId === purchase.id ? <><LoaderCircle className="size-3.5 animate-spin" /> جارٍ الاستلام…</> : <><CheckCircle2 className="size-3.5" /> استلام</>}</Button>}</Td>
        </tr>)}</tbody></Table>
      </StateView>
    </Card>
  </div>;
}
