import { describe, expect, it } from 'vitest';
import { allocateFefo, remainingReturnable, saleTotal } from '../src/domain/rules.js';
import { allocateReturnToBatches, netSaleValues, salesDateRange } from '../src/domain/sales.js';

describe('pharmacy business rules', () => {
  it('allocates valid stock by earliest expiry and can split batches', () => {
    const today = new Date('2026-09-25');
    const allocation = allocateFefo([{ id: 'late', availableQuantity: 10, expiryDate: new Date('2027-05-01') }, { id: 'early', availableQuantity: 2, expiryDate: new Date('2026-12-01') }, { id: 'expired', availableQuantity: 99, expiryDate: new Date('2026-01-01') }], 5, today);
    expect(allocation).toEqual([{ batchId: 'early', quantity: 2 }, { batchId: 'late', quantity: 3 }]);
  });
  it('rejects insufficient valid stock', () => expect(() => allocateFefo([{ id: 'one', availableQuantity: 1, expiryDate: new Date('2027-01-01') }], 2, new Date('2026-01-01'))).toThrow('INSUFFICIENT_STOCK'));
  it('calculates totals without changing history', () => expect(saleTotal([{ quantity: 2, unitPrice: 45 }, { quantity: 1, unitPrice: 95, discount: 5 }], 10, 0)).toEqual({ subtotal: 185, itemDiscount: 5, total: 170 }));
  it('prevents returning more than remains', () => expect(remainingReturnable(3, 2)).toBe(1));
});

describe('sales reporting', () => {
  it('builds an exclusive date range for a specific day', () => {
    const range = salesDateRange('specific', '2026-09-25');
    expect(range.from.getFullYear()).toBe(2026);
    expect(range.from.getMonth()).toBe(8);
    expect(range.from.getDate()).toBe(25);
    expect(range.to.getDate()).toBe(26);
  });

  it('subtracts returns from revenue and units without going negative', () => {
    expect(netSaleValues(200, 65, 4, 1)).toEqual({ returnedAmount: 65, netTotal: 135, itemsSold: 3 });
    expect(netSaleValues(50, 80, 1, 2)).toEqual({ returnedAmount: 80, netTotal: 0, itemsSold: 0 });
  });

  it('restocks later batch allocations after a previous partial return', () => {
    const allocations = [
      { batchId: 'early', quantity: 2, expiryDate: new Date('2026-10-01') },
      { batchId: 'later', quantity: 3, expiryDate: new Date('2027-01-01') },
    ];
    expect(allocateReturnToBatches(allocations, 3, 1)).toEqual([
      { batchId: 'early', quantity: 1 },
      { batchId: 'later', quantity: 2 },
    ]);
    expect(allocateReturnToBatches(allocations, 1, 4)).toEqual([{ batchId: 'later', quantity: 1 }]);
  });
});
