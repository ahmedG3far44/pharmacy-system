import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
let activeCurrencySymbol = 'EGP';
export const configureMoney = (currencySymbol?: string) => { activeCurrencySymbol = currencySymbol?.trim() || 'EGP'; };
export const money = (value: string | number | null | undefined) => `${Number(value ?? 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${activeCurrencySymbol}`;
export const shortDate = (value: string | Date) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
export const dateTime = (value: string | Date) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
