import { useState, type FormEvent } from 'react';
import { Plus, Search } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { money } from '../lib/utils';
import type { Paged, Product } from '../types';
import { Badge, Card, Field, Input, PageHeader, Select, StateView, Table, Td, Th } from '../components/ui/core';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/ui/pagination';
import { useAuth } from '../context/auth-context';

type Category = { id: string; name: string };
type Manufacturer = { id: string; name: string };

export function ProductsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const search = useDebouncedValue(searchInput);
  const { can } = useAuth();
  const products = useAsync(
    () => apiGet<Paged<Product>>(`/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
    [page, limit, search],
  );
  const categories = useAsync(() => apiGet<Category[]>('/categories'), []);
  const manufacturers = useAsync(() => apiGet<Manufacturer[]>('/manufacturers'), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      await apiPost('/products', {
        name: form.get('name'), genericName: form.get('genericName') || undefined,
        barcode: form.get('barcode'), sku: form.get('sku'), categoryId: form.get('categoryId'),
        manufacturerId: form.get('manufacturerId') || undefined, strength: form.get('strength') || undefined,
        dosageForm: form.get('dosageForm') || undefined, sellingPrice: Number(form.get('sellingPrice')),
        defaultPurchasePrice: Number(form.get('defaultPurchasePrice')), minimumStock: Number(form.get('minimumStock')),
        prescriptionRequired: form.get('prescriptionRequired') === 'on', isActive: true,
      });
      setShowForm(false);
      await products.run();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إنشاء المنتج.');
    } finally { setSaving(false); }
  };

  return <div className="page-enter">
    <PageHeader title="المنتجات" description="دليل الأدوية والأسعار ومدى توفرها للبيع." action={can('product:create') && <Button onClick={() => setShowForm((value) => !value)}><Plus className="size-4" /> منتج جديد</Button>} />

    {showForm && <Card className="mb-6 p-5">
      <h2 className="mb-4 font-semibold">إضافة منتج</h2>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="اسم المنتج"><Input dir="ltr" name="name" required /></Field><Field label="الاسم العلمي"><Input dir="ltr" name="genericName" /></Field>
        <Field label="الباركود"><Input dir="ltr" name="barcode" required /></Field><Field label="رمز الصنف SKU"><Input dir="ltr" name="sku" required /></Field>
        <Field label="التصنيف"><Select name="categoryId" required><option value="">اختر التصنيف</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="الشركة المصنعة"><Select name="manufacturerId"><option value="">بدون شركة مصنعة</option>{manufacturers.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="التركيز"><Input dir="ltr" name="strength" placeholder="500mg" /></Field><Field label="الشكل الدوائي"><Input dir="ltr" name="dosageForm" placeholder="Tablet" /></Field>
        <Field label="سعر البيع"><Input name="sellingPrice" type="number" min="0" step="0.01" required /></Field><Field label="سعر الشراء"><Input name="defaultPurchasePrice" type="number" min="0" step="0.01" required /></Field>
        <Field label="الحد الأدنى للمخزون"><Input name="minimumStock" type="number" min="0" required /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="prescriptionRequired" type="checkbox" /> يتطلب وصفة طبية</label>
        {message && <div className="text-sm text-destructive sm:col-span-2 xl:col-span-4">{message}</div>}
        <div className="flex gap-2 sm:col-span-2 xl:col-span-4"><Button disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ المنتج'}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button></div>
      </form>
    </Card>}

    <Card>
      <div className="border-b border-border p-4">
        <div className="relative max-w-md"><Search className="absolute right-3 top-3 size-4 text-muted-foreground" /><Input className="pr-9" placeholder="البحث بالاسم أو الاسم العلمي أو الباركود أو SKU" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} /></div>
      </div>
      <StateView loading={products.loading} error={products.error} empty={!products.data?.items.length} onRetry={products.run}>
        <>
          <Table><thead><tr><Th>المنتج</Th><Th>التصنيف</Th><Th>السعر</Th><Th>المخزون</Th><Th>النوع</Th></tr></thead><tbody>{products.data?.items.map((product) => <tr key={product.id}><Td><div dir="ltr" className="text-left font-semibold text-foreground">{product.name}</div><div dir="ltr" className="text-left text-xs text-muted-foreground">{product.genericName || product.sku}</div></Td><Td dir="ltr" className="text-left">{product.category.name}</Td><Td className="ltr-data font-semibold">{money(product.sellingPrice)}</Td><Td><Badge tone={product.availableQuantity === 0 ? 'red' : product.availableQuantity <= product.minimumStock ? 'amber' : 'green'}><bdi>{product.availableQuantity}</bdi> وحدة</Badge></Td><Td>{product.prescriptionRequired ? <Badge tone="purple">بوصفة</Badge> : <span className="text-muted-foreground">بدون وصفة</span>}</Td></tr>)}</tbody></Table>
          {products.data && <Pagination pagination={products.data.pagination} onPageChange={setPage} onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }} />}
        </>
      </StateView>
    </Card>
  </div>;
}
