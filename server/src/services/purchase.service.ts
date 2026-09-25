import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/http.js';

export async function receivePurchase(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!purchase) throw new AppError(404, 'PURCHASE_NOT_FOUND', 'Purchase not found.');
    if (purchase.status !== 'DRAFT') throw new AppError(409, 'PURCHASE_ALREADY_RECEIVED', 'Only a draft purchase can be received.');
    for (const item of purchase.items) {
      const batch = await tx.inventoryBatch.create({ data: { productId: item.productId, purchaseItemId: item.id, batchNumber: item.batchNumber, purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice, initialQuantity: item.quantity, availableQuantity: item.quantity, expiryDate: item.expiryDate } });
      await tx.inventoryMovement.create({ data: { productId: item.productId, batchId: batch.id, type: 'PURCHASE', quantity: item.quantity, quantityBefore: 0, quantityAfter: item.quantity, referenceType: 'PURCHASE', referenceId: purchase.id, createdById: userId } });
    }
    await tx.purchase.update({ where: { id }, data: { status: 'RECEIVED', receivedAt: new Date(), receivedById: userId } });
    await tx.auditLog.create({ data: { userId, action: 'RECEIVE_PURCHASE', entityType: 'Purchase', entityId: id } });
    return tx.purchase.findUniqueOrThrow({ where: { id }, include: { supplier: true, items: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

