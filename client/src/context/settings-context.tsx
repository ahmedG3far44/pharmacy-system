import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGet, apiPut } from '../lib/api';
import { configureMoney } from '../lib/utils';

export type PharmacySettings = {
  pharmacyName: string;
  currency: string;
  currencySymbol: string;
  defaultTax: number;
  expiryWarningDays: number;
  receiptFooter: string;
};

const defaults: PharmacySettings = {
  pharmacyName: 'صيدلية ديمو', currency: 'EGP', currencySymbol: 'EGP', defaultTax: 0,
  expiryWarningDays: 30, receiptFooter: 'شكرًا لاختياركم صيدلية ديمو',
};

type SettingsContextValue = {
  settings: PharmacySettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (values: PharmacySettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);
const normalize = (value: Partial<PharmacySettings>): PharmacySettings => ({
  pharmacyName: String(value.pharmacyName ?? defaults.pharmacyName),
  currency: String(value.currency ?? defaults.currency),
  currencySymbol: String(value.currencySymbol ?? value.currency ?? defaults.currencySymbol),
  defaultTax: Number(value.defaultTax ?? defaults.defaultTax),
  expiryWarningDays: Number(value.expiryWarningDays ?? defaults.expiryWarningDays),
  receiptFooter: String(value.receiptFooter ?? defaults.receiptFooter),
});

export function PharmacySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = (next: PharmacySettings) => {
    configureMoney(next.currencySymbol || next.currency);
    document.title = next.pharmacyName;
    setSettings(next);
  };
  const refresh = async () => {
    setLoading(true); setError(null);
    try { apply(normalize(await apiGet<Partial<PharmacySettings>>('/settings'))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل إعدادات الصيدلية.'); }
    finally { setLoading(false); }
  };
  const updateSettings = async (values: PharmacySettings) => {
    const updated = normalize(await apiPut<Partial<PharmacySettings>>('/settings', values));
    apply(updated);
  };
  useEffect(() => { void refresh(); }, []);
  return <SettingsContext.Provider value={{ settings, loading, error, refresh, updateSettings }}>{children}</SettingsContext.Provider>;
}

export function usePharmacySettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('usePharmacySettings must be used inside PharmacySettingsProvider');
  return context;
}
