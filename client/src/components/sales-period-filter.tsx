import { CalendarDays } from 'lucide-react';
import { Input, Select } from './ui/core';

export type SalesPeriod = 'today' | 'yesterday' | 'month' | 'last_month' | 'three_months' | 'six_months' | 'year' | 'specific';
export const salesPeriodOptions: { value: SalesPeriod; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'last_month', label: 'الشهر الماضي' },
  { value: 'three_months', label: 'آخر 3 أشهر' },
  { value: 'six_months', label: 'آخر 6 أشهر' },
  { value: 'year', label: 'هذه السنة' },
  { value: 'specific', label: 'يوم محدد' },
];

export function SalesPeriodFilter({ period, date, onPeriodChange, onDateChange, className = '' }: { period: SalesPeriod; date: string; onPeriodChange: (period: SalesPeriod) => void; onDateChange: (date: string) => void; className?: string }) {
  return <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${className}`}>
    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
      <CalendarDays className="size-4 shrink-0 text-primary" />
      <span className="sr-only">فترة التقرير</span>
      <Select className="min-w-44" value={period} onChange={(event) => onPeriodChange(event.target.value as SalesPeriod)}>
        {salesPeriodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </label>
    {period === 'specific' && <Input className="w-full sm:w-auto" aria-label="تاريخ المبيعات المحدد" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />}
  </div>;
}
