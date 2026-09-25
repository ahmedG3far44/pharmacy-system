import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, Field, Input, PageHeader, StateView, Textarea } from '../components/ui/core';
import { usePharmacySettings, type PharmacySettings } from '../context/settings-context';

export function SettingsPage() {
  const { settings, loading, error, refresh, updateSettings } = usePharmacySettings();
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setSaved(''); setSaveError('');
    const form = new FormData(event.currentTarget);
    const values: PharmacySettings = {
      pharmacyName: String(form.get('pharmacyName') ?? ''),
      currency: String(form.get('currency') ?? ''),
      currencySymbol: String(form.get('currencySymbol') ?? ''),
      defaultTax: Number(form.get('defaultTax')),
      expiryWarningDays: Number(form.get('expiryWarningDays')),
      receiptFooter: String(form.get('receiptFooter') ?? ''),
    };
    try { await updateSettings(values); setSaved('تم حفظ الإعدادات وتطبيقها في جميع أجزاء النظام.'); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.'); }
    finally { setSaving(false); }
  };

  return <div className="page-enter">
    <PageHeader title="الإعدادات" description="هوية الصيدلية والعملة والإيصال وقواعد تنبيهات المخزون." />
    <Card className="max-w-3xl p-6">
      <StateView loading={loading} error={error} onRetry={refresh}>
        <form key={`${settings.pharmacyName}-${settings.currencySymbol}`} onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <Field label="اسم الصيدلية"><Input name="pharmacyName" defaultValue={settings.pharmacyName} required /></Field>
          <Field label="رمز العملة"><Input dir="ltr" name="currency" defaultValue={settings.currency} placeholder="EGP" required /></Field>
          <Field label="علامة العملة"><Input dir="ltr" name="currencySymbol" defaultValue={settings.currencySymbol} placeholder="EGP أو $" required /></Field>
          <Field label="الضريبة الافتراضية %"><Input name="defaultTax" type="number" min="0" step="0.01" defaultValue={settings.defaultTax} /></Field>
          <Field label="تنبيه الصلاحية (بالأيام)"><Input name="expiryWarningDays" type="number" min="1" defaultValue={settings.expiryWarningDays} /></Field>
          <div className="sm:col-span-2"><Field label="تذييل الإيصال"><Textarea name="receiptFooter" defaultValue={settings.receiptFooter} /></Field></div>
          {saved && <p className="text-sm text-emerald-700 sm:col-span-2">{saved}</p>}
          {saveError && <p className="text-sm text-destructive sm:col-span-2">{saveError}</p>}
          <div className="sm:col-span-2"><Button disabled={saving}><Save className="size-4" />{saving ? 'جارٍ الحفظ…' : 'حفظ وتطبيق'}</Button></div>
        </form>
      </StateView>
    </Card>
  </div>;
}
