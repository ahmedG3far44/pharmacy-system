import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import { useAsync } from '../hooks/use-async';
import { arabicLabel } from '../lib/i18n';
import { Badge, Card, Field, Input, PageHeader, Select, StateView, Table, Td, Th } from '../components/ui/core';
import { Button } from '../components/ui/button';

type Employee = { id: string; name: string; phone: string; role: string; isActive: boolean; lastLoginAt?: string; _count: { sales: number; audits: number } };

export function UsersPage() {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState('');
  const state = useAsync(() => apiGet<Employee[]>('/users'), []);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await apiPost('/users', { name: form.get('name'), phone: form.get('phone'), password: form.get('password'), role: form.get('role') }); setOpen(false); await state.run(); } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر إنشاء الموظف.'); } };
  const toggle = async (employee: Employee) => { await apiPatch(`/users/${employee.id}`, { isActive: !employee.isActive }); await state.run(); };
  return <div className="page-enter"><PageHeader title="الموظفون" description="الحسابات والأدوار وحالة الوصول." action={<Button onClick={() => setOpen(!open)}><Plus className="size-4" /> موظف جديد</Button>} />
    {open && <Card className="mb-6 p-5"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="الاسم الكامل"><Input name="name" required /></Field><Field label="الهاتف"><Input name="phone" type="tel" required /></Field><Field label="كلمة مرور مؤقتة"><Input dir="ltr" name="password" type="password" minLength={8} required /></Field><Field label="الدور"><Select name="role"><option value="CASHIER">أمين صندوق</option><option value="PHARMACIST">صيدلي</option><option value="ADMIN">مدير النظام</option></Select></Field>{message && <p className="text-sm text-red-600 lg:col-span-4">{message}</p>}<div className="lg:col-span-4"><Button>إنشاء الموظف</Button></div></form></Card>}
    <Card><StateView loading={state.loading} error={state.error} empty={!state.data?.length} onRetry={state.run}><Table><thead><tr><Th>الموظف</Th><Th>الدور</Th><Th>المبيعات</Th><Th>النشاط</Th><Th>الحالة</Th><Th></Th></tr></thead><tbody>{state.data?.map((employee) => <tr key={employee.id}><Td><strong>{employee.name}</strong><div className="text-xs text-muted-foreground"><bdi>{employee.phone}</bdi></div></Td><Td><Badge tone={employee.role === 'ADMIN' ? 'purple' : employee.role === 'PHARMACIST' ? 'blue' : 'slate'}>{arabicLabel(employee.role)}</Badge></Td><Td><bdi>{employee._count.sales}</bdi></Td><Td><bdi>{employee._count.audits}</bdi> حدث</Td><Td><Badge tone={employee.isActive ? 'green' : 'red'}>{employee.isActive ? 'نشط' : 'معطّل'}</Badge></Td><Td><Button size="sm" variant="outline" onClick={() => void toggle(employee)}>{employee.isActive ? 'تعطيل' : 'تفعيل'}</Button></Td></tr>)}</tbody></Table></StateView></Card>
  </div>;
}
