import { useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, Check, ChevronRight, Minus, Plus, Printer, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { cn, money, dateTime } from '../lib/utils';
import type { Paged, Product } from '../types';
import { Badge, Card, Input, StateView } from '../components/ui/core';
import { Button } from '../components/ui/button';
import { usePharmacySettings } from '../context/settings-context';
import { PaymentDialog, type CheckoutPaymentMethod } from '../components/payment-dialog';

type CartItem = { product: Product; quantity: number; discount: number };
type Receipt = { id: string; invoiceNumber: string; subtotal: string; itemDiscount: string; orderDiscount: string; tax: string; total: string; paidAmount: string; changeAmount: string; createdAt: string; cashier: { name: string }; items: { id: string; productNameSnapshot: string; quantity: number; unitPrice: string; subtotal: string }[]; payments: { method: string; amount: string }[] };

export function PosPage() {
  const [query, setQuery] = useState(''); const [products, setProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true); const [searchError, setSearchError] = useState(''); const [paymentError, setPaymentError] = useState(''); const [cart, setCart] = useState<CartItem[]>([]); const [checkoutOpen, setCheckoutOpen] = useState(false); const [submitting, setSubmitting] = useState(false); const [receipt, setReceipt] = useState<Receipt | null>(null); const searchRef = useRef<HTMLInputElement>(null);
  const load = async () => { setLoading(true); setSearchError(''); try { const result = await apiGet<Paged<Product>>(`/products?limit=40&search=${encodeURIComponent(query)}`); setProducts(result.items); } catch (err) { setSearchError(err instanceof Error ? err.message : 'تعذر البحث عن المنتجات.'); } finally { setLoading(false); } };
  useEffect(() => { const timer = setTimeout(() => void load(), 180); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { searchRef.current?.focus(); }, []);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.sellingPrice) * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const add = (product: Product) => { if (product.availableQuantity < 1) return; setCart((items) => { const found = items.find((item) => item.product.id === product.id); if (found) return items.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.availableQuantity) } : item); return [...items, { product, quantity: 1, discount: 0 }]; }); setQuery(''); searchRef.current?.focus(); };
  const quantity = (id: string, delta: number) => setCart((items) => items.map((item) => item.product.id === id ? { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, item.product.availableQuantity)) } : item));
  const pay = async (method: CheckoutPaymentMethod, amount: number) => { setSubmitting(true); setPaymentError(''); try { const result = await apiPost<Receipt>('/sales', { items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity, discount: item.discount })), payment: { method, amount } }); setReceipt(result); setCheckoutOpen(false); setCart([]); } catch (err) { setPaymentError(err instanceof Error ? err.message : 'فشل إتمام عملية البيع.'); } finally { setSubmitting(false); } };
  if (receipt) return <ReceiptView receipt={receipt} onDone={() => { setReceipt(null); searchRef.current?.focus(); }}/>;
  return <div className="page-enter -m-4 sm:-m-6 lg:-m-8"><div className="grid min-h-[calc(100vh-4.25rem)] xl:grid-cols-[1fr_420px]">
    <section className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5"><p className="text-xs font-bold text-primary">نقطة البيع</p><h1 className="mt-1 text-2xl font-bold tracking-tight">ابحث عن منتج</h1></div>
      <div className="relative"><Search className="absolute right-4 top-3.5 size-5 text-muted-foreground"/><Input ref={searchRef} className="h-12 pl-12 pr-12 text-base" placeholder="ابحث عن دواء أو اسم علمي أو SKU أو امسح الباركود…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && products.length === 1) add(products[0]); }}/><Barcode className="absolute left-4 top-3.5 size-5 text-muted-foreground"/></div>
      <p className="mt-2 text-xs text-muted-foreground">يعمل ماسح الباركود هنا تلقائيًا · اضغط Enter عند وجود نتيجة مطابقة</p>
      <StateView loading={loading} error={searchError} empty={!products.length} onRetry={load}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} cartQuantity={cart.find((item) => item.product.id === product.id)?.quantity ?? 0} onAdd={add} />)}</div>
      </StateView>
    </section>
    <aside className="border-t border-border bg-card xl:border-r xl:border-t-0"><div className="sticky top-17 flex h-[calc(100vh-4.25rem)] flex-col"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2"><ShoppingCart className="size-5 text-primary"/><h2 className="font-bold">البيع الحالي</h2><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground"><bdi>{cart.length}</bdi></span></div>{cart.length > 0 && <Button variant="ghost" size="sm" onClick={() => setCart([])}>مسح</Button>}</div><div className="flex-1 overflow-y-auto p-3">{cart.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><div className="grid size-14 place-items-center rounded-md bg-secondary text-muted-foreground"><ShoppingCart className="size-6"/></div><p className="mt-4 font-semibold text-foreground">السلة فارغة</p><p className="mt-1 max-w-52 text-sm text-muted-foreground">ابحث عن دواء أو امسح الباركود لبدء البيع.</p></div> : <div className="space-y-2">{cart.map((item) => <div key={item.product.id} className="rounded-md border border-border p-3"><div className="flex gap-3"><div className="min-w-0 flex-1"><p dir="ltr" className="truncate text-left text-sm font-semibold">{item.product.name}</p><p className="ltr-data text-xs text-muted-foreground">{money(item.product.sellingPrice)} للقطعة</p></div><button aria-label={`إزالة ${item.product.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => setCart((items) => items.filter((value) => value.product.id !== item.product.id))}><Trash2 className="size-4"/></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-md border border-border"><button aria-label="تقليل الكمية" className="p-1.5 hover:bg-muted" onClick={() => quantity(item.product.id, -1)}><Minus className="size-3.5"/></button><span className="w-8 text-center text-sm font-bold"><bdi>{item.quantity}</bdi></span><button aria-label="زيادة الكمية" className="p-1.5 hover:bg-muted" onClick={() => quantity(item.product.id, 1)}><Plus className="size-3.5"/></button></div><p className="ltr-data font-bold">{money(Number(item.product.sellingPrice) * item.quantity)}</p></div></div>)}</div>}</div><div className="border-t border-border p-5"><div className="mb-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">الإجمالي الفرعي</span><span className="ltr-data text-xl font-bold">{money(subtotal)}</span></div><Button size="lg" className="w-full" disabled={!cart.length} onClick={() => { setPaymentError(''); setCheckoutOpen(true); }}>إتمام البيع <ChevronRight className="size-4 rotate-180"/></Button></div></div></aside>
  </div><PaymentDialog open={checkoutOpen} total={subtotal} itemCount={itemCount} lineCount={cart.length} submitting={submitting} error={paymentError} onOpenChange={setCheckoutOpen} onConfirm={pay} /></div>;
}

function ProductCard({ product, cartQuantity, onAdd }: { product: Product; cartQuantity: number; onAdd: (product: Product) => void }) {
  const outOfStock = product.availableQuantity === 0;
  const lowStock = !outOfStock && product.availableQuantity <= product.minimumStock;

  return <button
    type="button"
    onClick={() => onAdd(product)}
    disabled={outOfStock}
    aria-label={`${product.name}، ${money(product.sellingPrice)}، ${outOfStock ? 'غير متوفر' : `${product.availableQuantity} متوفر`}`}
    className={cn(
      'group flex min-h-44 flex-col rounded-md border bg-card p-4 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      cartQuantity > 0 ? 'border-primary bg-accent/30' : 'border-border hover:border-primary/60 hover:bg-muted/60',
      outOfStock && 'cursor-not-allowed bg-muted opacity-60',
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="max-w-[65%] truncate rounded bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">{product.category.name}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        {product.prescriptionRequired && <Badge tone="purple">Rx</Badge>}
        {cartQuantity > 0 && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground"><bdi>{cartQuantity}</bdi> في السلة</span>}
      </div>
    </div>

    <div className="mt-3 min-w-0">
      <h3 dir="ltr" className="truncate text-left text-sm font-semibold text-foreground group-hover:text-accent-foreground">{product.name}</h3>
      <p dir="ltr" className="mt-1 truncate text-left text-xs text-muted-foreground">{product.genericName || product.sku}</p>
    </div>

    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
      <p className="ltr-data text-lg font-bold tracking-tight text-foreground">{money(product.sellingPrice)}</p>
      <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', outOfStock ? 'bg-red-50 text-red-700' : lowStock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
        <span className="size-1.5 rounded-full bg-current" />
        {outOfStock ? 'غير متوفر' : <><bdi>{product.availableQuantity}</bdi> متاح</>}
      </div>
    </div>

    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px]">
      <span className="font-mono text-muted-foreground">{product.sku}</span>
      <span className={cn('flex items-center gap-1 font-semibold', outOfStock ? 'text-muted-foreground' : 'text-primary')}><Plus className="size-3.5" />{cartQuantity > 0 ? 'إضافة أخرى' : 'إضافة للبيع'}</span>
    </div>
  </button>;
}

function ReceiptView({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  const { settings } = usePharmacySettings();
  return <div className="page-enter mx-auto max-w-md"><Card className="print-area overflow-hidden"><div className="bg-primary p-6 text-center text-primary-foreground"><div className="mx-auto grid size-12 place-items-center rounded-full bg-white/15"><Check className="size-6 text-white"/></div><h1 className="mt-3 text-xl font-bold">تمت عملية البيع</h1><p className="font-mono text-sm text-blue-50/80">{receipt.invoiceNumber}</p></div><div className="p-6"><div className="mb-5 text-center"><h2 className="text-lg font-bold">{settings.pharmacyName}</h2><p className="text-xs text-muted-foreground">{dateTime(receipt.createdAt)} · {receipt.cashier.name}</p></div><div className="space-y-3 border-y border-dashed border-border py-4">{receipt.items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><div><p dir="ltr" className="text-left font-medium">{item.productNameSnapshot}</p><p className="ltr-data text-xs text-muted-foreground">{item.quantity} × {money(item.unitPrice)}</p></div><strong className="ltr-data">{money(item.subtotal)}</strong></div>)}</div><div className="space-y-2 py-4 text-sm"><div className="flex justify-between text-muted-foreground"><span>الإجمالي الفرعي</span><span className="ltr-data">{money(receipt.subtotal)}</span></div><div className="flex justify-between text-lg font-bold"><span>الإجمالي</span><span className="ltr-data">{money(receipt.total)}</span></div><div className="flex justify-between text-muted-foreground"><span>{receipt.payments[0]?.method === 'CASH' ? 'نقدي' : receipt.payments[0]?.method === 'CARD' ? 'بطاقة' : 'محفظة إلكترونية'}</span><span className="ltr-data">{money(receipt.paidAmount)}</span></div><div className="flex justify-between text-muted-foreground"><span>الباقي</span><span className="ltr-data">{money(receipt.changeAmount)}</span></div></div><p className="border-t border-dashed border-border pt-4 text-center text-xs text-muted-foreground">{settings.receiptFooter}</p></div></Card><div className="no-print mt-4 grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4"/> طباعة الإيصال</Button><Button onClick={onDone}>بيع جديد</Button></div></div>;
}
