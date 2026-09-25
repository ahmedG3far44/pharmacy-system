import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/http.js';

export async function adjustInventory(batchId: string, delta: number, reason: string, userId: string, kind?: 'DAMAGED'|'EXPIRED') {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; productId: string; availableQuantity: number }>>`SELECT id, "productId", "availableQuantity" FROM "InventoryBatch" WHERE id = ${batchId}::uuid FOR UPDATE`;
    const batch = rows[0];
    if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Inventory batch not found.');
    const after = batch.availableQuantity + delta;
    if (after < 0) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Inventory cannot become negative.');
    const type = kind ?? (delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT');
    const status = kind === 'DAMAGED' ? 'DAMAGED' : kind === 'EXPIRED' ? 'EXPIRED' : after === 0 ? 'DEPLETED' : 'ACTIVE';
    const updated = await tx.inventoryBatch.update({ where: { id: batchId }, data: { availableQuantity: after, status } });
    await tx.inventoryMovement.create({ data: { productId: batch.productId, batchId, type, quantity: delta, quantityBefore: batch.availableQuantity, quantityAfter: after, reason, createdById: userId } });
    await tx.auditLog.create({ data: { userId, action: 'ADJUST_INVENTORY', entityType: 'InventoryBatch', entityId: batchId, previousData: { quantity: batch.availableQuantity }, newData: { quantity: after, reason } } });
    return updated;
  });
}
