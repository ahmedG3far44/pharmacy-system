export type BatchCandidate = { id: string; availableQuantity: number; expiryDate: Date };
export function allocateFefo(batches: BatchCandidate[], requested: number, today = new Date()) {
  if (!Number.isInteger(requested) || requested <= 0) throw new Error('Quantity must be a positive integer.');
  const eligible = batches.filter((batch) => batch.availableQuantity > 0 && batch.expiryDate >= today).sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  if (eligible.reduce((sum, batch) => sum + batch.availableQuantity, 0) < requested) throw new Error('INSUFFICIENT_STOCK');
  let remaining = requested;
  return eligible.flatMap((batch) => { if (!remaining) return []; const quantity = Math.min(remaining, batch.availableQuantity); remaining -= quantity; return [{ batchId: batch.id, quantity }]; });
}
export function saleTotal(items: { quantity: number; unitPrice: number; discount?: number }[], orderDiscount = 0, tax = 0) { const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); const itemDiscount = items.reduce((sum, item) => sum + (item.discount ?? 0), 0); return { subtotal, itemDiscount, total: subtotal - itemDiscount - orderDiscount + tax }; }
export function remainingReturnable(sold: number, returned: number) { return Math.max(0, sold - returned); }

