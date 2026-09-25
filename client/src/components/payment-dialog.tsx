import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, Banknote, Check, CreditCard, LoaderCircle, ShieldCheck, Smartphone, X } from 'lucide-react';
import { money } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/core';
import { cn } from '../lib/utils';

export type CheckoutPaymentMethod = 'CASH' | 'CARD' | 'MOBILE_WALLET';

const methods = [
  { value: 'CASH', label: 'نقدي', description: 'أدخل المبلغ المستلم', icon: Banknote },
  { value: 'CARD', label: 'بطاقة', description: 'تحصيل عبر جهاز البطاقة', icon: CreditCard },
  { value: 'MOBILE_WALLET', label: 'محفظة', description: 'تأكيد تحويل المحفظة', icon: Smartphone },
] as const;

function quickCashAmounts(total: number) {
  const rounded = [5, 10, 20, 50, 100, 200]
    .map((step) => Math.ceil(total / step) * step)
    .filter((amount) => amount > total);
  return [total, ...Array.from(new Set(rounded)).slice(0, 3)];
}

export function PaymentDialog({ open, total, itemCount, lineCount, submitting, error, onOpenChange, onConfirm }: {
  open: boolean;
  total: number;
  itemCount: number;
  lineCount: number;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: CheckoutPaymentMethod, amount: number) => Promise<void>;
}) {
  const [method, setMethod] = useState<CheckoutPaymentMethod>('CASH');
  const [received, setReceived] = useState('');
  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMethod('CASH');
    setReceived(total.toFixed(2));
  }, [open, total]);

  const receivedAmount = Number(received);
  const validCashAmount = received.trim() !== '' && Number.isFinite(receivedAmount) && receivedAmount >= total;
  const cashNeedsAttention = !validCashAmount;
  const amountDue = method === 'CASH' && Number.isFinite(receivedAmount) ? Math.max(0, total - receivedAmount) : 0;
  const change = method === 'CASH' && Number.isFinite(receivedAmount) ? Math.max(0, receivedAmount - total) : 0;
  const quickAmounts = useMemo(() => quickCashAmounts(total), [total]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || (method === 'CASH' && !validCashAmount)) return;
    void onConfirm(method, method === 'CASH' ? receivedAmount : total);
  };

  const setPaymentMethod = (nextMethod: CheckoutPaymentMethod) => {
    setMethod(nextMethod);
    setReceived(total.toFixed(2));
    if (nextMethod === 'CASH') window.setTimeout(() => cashInputRef.current?.focus(), 0);
  };

  return <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!submitting) onOpenChange(nextOpen); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-y-0 left-0 right-0 z-50 bg-slate-950/45 backdrop-blur-[1px] lg:right-64" />
      <Dialog.Content onOpenAutoFocus={(event) => { event.preventDefault(); window.setTimeout(() => cashInputRef.current?.focus(), 0); }} className="fixed left-1/2 top-1/2 z-[60] flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(15,23,42,.24)] focus:outline-none lg:left-[calc(50%_-_8rem)]">
        <div className="flex items-start gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold text-primary">إتمام عملية البيع</p>
            <Dialog.Title className="text-xl font-bold tracking-tight text-foreground">تأكيد الدفع</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">راجع الإجمالي وسجّل طريقة دفع العميل.</Dialog.Description>
          </div>
          <Dialog.Close disabled={submitting} className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" aria-label="إغلاق نافذة الدفع"><X className="size-4" /></Dialog.Close>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-5 rounded-md border border-blue-100 bg-accent/55 px-4 py-4">
              <div><p className="text-xs font-medium text-muted-foreground">المبلغ المستحق</p><p className="mt-1 text-xs text-accent-foreground"><bdi>{itemCount}</bdi> قطعة ضمن <bdi>{lineCount}</bdi> منتج</p></div>
              <strong className="ltr-data text-left text-2xl font-bold tracking-tight text-foreground">{money(total)}</strong>
            </div>

            <fieldset className="mt-6">
              <legend className="mb-3 text-sm font-semibold text-foreground">طريقة الدفع</legend>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((option) => <button key={option.value} type="button" aria-pressed={method === option.value} onClick={() => setPaymentMethod(option.value)} className={cn('rounded-md border p-3 text-right transition-colors focus:outline-none focus:ring-2 focus:ring-ring', method === option.value ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary' : 'border-border bg-background text-secondary-foreground hover:bg-muted')}>
                  <option.icon className={cn('mb-3 size-5', method === option.value ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 hidden text-[11px] leading-4 text-muted-foreground sm:block">{option.description}</span>
                </button>)}
              </div>
            </fieldset>

            {method === 'CASH' ? <div className="mt-6">
              <label htmlFor="cash-received" className="mb-2 block text-sm font-semibold text-foreground">المبلغ النقدي المستلم</label>
              <div className="relative">
                <Input ref={cashInputRef} id="cash-received" className="h-14 pl-20 text-xl font-bold tabular-nums" type="number" inputMode="decimal" min="0" step="0.01" value={received} onChange={(event) => setReceived(event.target.value)} onFocus={(event) => event.currentTarget.select()} aria-describedby="cash-payment-status" />
                <span className="pointer-events-none absolute left-4 top-4 text-sm font-medium text-muted-foreground">المبلغ</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickAmounts.map((amount, index) => <button key={amount} type="button" onClick={() => setReceived(amount.toFixed(2))} className={cn('rounded-md border px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring', Math.abs(receivedAmount - amount) < 0.005 ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-background text-secondary-foreground hover:bg-muted')}>{index === 0 ? 'المبلغ بالضبط' : money(amount)}</button>)}
              </div>

              <div id="cash-payment-status" aria-live="polite" className={cn('mt-4 flex items-center justify-between rounded-md border px-4 py-3', cashNeedsAttention ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50')}>
                <div><p className={cn('text-xs font-semibold', cashNeedsAttention ? 'text-red-700' : 'text-emerald-700')}>{cashNeedsAttention ? 'المبلغ المتبقي' : 'الباقي للعميل'}</p><p className="mt-0.5 text-xs text-muted-foreground">{cashNeedsAttention ? 'أدخل مبلغًا يساوي المستحق على الأقل.' : change === 0 ? 'تم استلام المبلغ بالضبط.' : 'أعد هذا المبلغ إلى العميل.'}</p></div>
                <strong className={cn('ltr-data text-lg font-bold tabular-nums', cashNeedsAttention ? 'text-red-700' : 'text-emerald-700')}>{money(cashNeedsAttention ? (Number.isFinite(receivedAmount) ? amountDue : total) : change)}</strong>
              </div>
            </div> : <div className="mt-6 flex gap-3 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div><p className="font-semibold">أكد {method === 'CARD' ? 'عملية جهاز البطاقة' : 'تحويل المحفظة الإلكترونية'}</p><p className="mt-1 text-xs leading-5 text-blue-800">لا تُكمل البيع إلا بعد اعتماد الدفع الخارجي بقيمة <bdi>{money(total)}</bdi> بالضبط.</p></div>
            </div>}

            {error && <div role="alert" className="mt-4 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
          </div>

          <div className="border-t border-border bg-muted px-5 py-4 sm:px-6">
            <p className="mb-3 text-center text-xs text-muted-foreground">يؤدي التأكيد إلى إنشاء عملية البيع وخصم الكميات المباعة من المخزون.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>العودة إلى البيع</Button>
              <Button type="submit" size="lg" className="sm:min-w-56" disabled={submitting || (method === 'CASH' && !validCashAmount)}>
                {submitting ? <><LoaderCircle className="size-4 animate-spin" /> جارٍ معالجة الدفع…</> : <><Check className="size-4" /> {method === 'CASH' ? 'تأكيد الدفع النقدي' : method === 'CARD' ? 'تأكيد دفع البطاقة' : 'تأكيد دفع المحفظة'}</>}
              </Button>
            </div>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
