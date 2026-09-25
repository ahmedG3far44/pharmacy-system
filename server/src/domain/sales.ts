export type SalesPeriod = 'today' | 'yesterday' | 'month' | 'last_month' | 'three_months' | 'six_months' | 'year' | 'specific' | 'all';

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function salesDateRange(period: SalesPeriod, specificDate?: string, now = new Date()) {
  const today = startOfDay(now);
  if (period === 'all') return { from: new Date(0), to: addDays(today, 1) };
  if (period === 'specific') {
    if (!specificDate || !/^\d{4}-\d{2}-\d{2}$/.test(specificDate)) throw new Error('A valid date is required.');
    const [year, month, day] = specificDate.split('-').map(Number);
    const from = new Date(year, month - 1, day);
    if (from.getFullYear() !== year || from.getMonth() !== month - 1 || from.getDate() !== day) throw new Error('A valid date is required.');
    return { from, to: addDays(from, 1) };
  }
  if (period === 'yesterday') return { from: addDays(today, -1), to: today };
  if (period === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  if (period === 'last_month') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (period === 'three_months') return { from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), to: addDays(today, 1) };
  if (period === 'six_months') return { from: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), to: addDays(today, 1) };
  if (period === 'year') return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear() + 1, 0, 1) };
  return { from: today, to: addDays(today, 1) };
}

export function netSaleValues(total: number, refunds: number, soldQuantity: number, returnedQuantity: number) {
  return {
    returnedAmount: Math.max(0, refunds),
    netTotal: Math.max(0, total - refunds),
    itemsSold: Math.max(0, soldQuantity - returnedQuantity),
  };
}

export type SoldBatchAllocation = { batchId: string; quantity: number; expiryDate: Date };

export function allocateReturnToBatches(allocations: SoldBatchAllocation[], quantity: number, previouslyRestocked: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Return quantity must be a positive integer.');
  let remaining = quantity;
  let offset = Math.max(0, previouslyRestocked);
  const result: { batchId: string; quantity: number }[] = [];
  for (const allocation of [...allocations].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())) {
    if (!remaining) break;
    const alreadyRestockedHere = Math.min(offset, allocation.quantity);
    offset -= alreadyRestockedHere;
    const capacity = allocation.quantity - alreadyRestockedHere;
    if (capacity <= 0) continue;
    const restored = Math.min(remaining, capacity);
    result.push({ batchId: allocation.batchId, quantity: restored });
    remaining -= restored;
  }
  if (remaining > 0) throw new Error('RETURN_ALLOCATION_ERROR');
  return result;
}
