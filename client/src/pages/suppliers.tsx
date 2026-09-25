import { useState, type FormEvent } from 'react';
import { Plus, Truck } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { Card, Field, Input, PageHeader, StateView } from '../components/ui/core';
import { Button } from '../components/ui/button';

type Supplier = { id: string; name: string; phone: string; email?: string; address?: string; isActive: boolean; _count: { purchases: number } };

export function SuppliersPage() {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState('');
  const state = useAsync(() => apiGet<Supplier[]>('/suppliers'), []);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await apiPost('/suppliers', { name: form.get('name'), phone: form.get('phone'), email: form.get('email'), address: form.get('address'), contactPerson: form.get('contactPerson') }); setOpen(false); await state.run(); } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر حفظ المورد.'); } };
  return <div className="page-enter"><PageHeader title="الموردون" description="شركاء التوزيع وسجل المشتريات." action={<Button onClick={() => setOpen(!open)}><Plus className="size-4" /> مورد جديد</Button>} />
    {open && <Card className="mb-6 p-5"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Field label="الاسم"><Input name="name" required /></Field><Field label="الهاتف"><Input name="phone" type="tel" required /></Field><Field label="البريد الإلكتروني"><Input dir="ltr" name="email" type="email" /></Field><Field label="العنوان"><Input name="address" /></Field><Field label="جهة الاتصال"><Input name="contactPerson" /></Field>{message && <p className="text-sm text-red-600 lg:col-span-5">{message}</p>}<div className="flex gap-2 lg:col-span-5"><Button>حفظ المورد</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button></div></form></Card>}
    <StateView loading={state.loading} error={state.error} empty={!state.data?.length} onRetry={state.run}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.data?.map((supplier) => <Card key={supplier.id} className="p-5"><div className="flex gap-4"><div className="grid size-11 place-items-center rounded-md bg-accent text-accent-foreground"><Truck className="size-5" /></div><div><h2 className="font-semibold">{supplier.name}</h2><p className="mt-1 text-sm text-muted-foreground"><bdi>{supplier.phone}</bdi></p><p className="text-sm text-muted-foreground">{supplier.address || 'لا يوجد عنوان'}</p><p className="mt-3 text-xs font-semibold text-primary"><bdi>{supplier._count.purchases}</bdi> عملية شراء</p></div></div></Card>)}</div></StateView>
  </div>;
}
