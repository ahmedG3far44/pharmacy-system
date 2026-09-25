import { Prisma, type PaymentMethod } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/http.js';
import { nextNumber } from '../lib/numbers.js';

export type CheckoutInput = { items: { productId: string; quantity: number; discount?: number }[]; orderDiscount?: number; tax?: number; payment: { method: PaymentMethod; amount: number; reference?: string } };

export async function completeSale(input: CheckoutInput, cashierId: string) {
  return prisma.$transaction(async (tx) => {
    const productIds = input.items.map((item) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    if (products.length !== new Set(productIds).size) throw new AppError(400, 'PRODUCT_UNAVAILABLE', 'One or more products are unavailable.');
    const productMap = new Map(products.map((product) => [product.id, product]));
    const subtotal = input.items.reduce((sum, item) => sum.plus(new Prisma.Decimal(productMap.get(item.productId)!.sellingPrice).times(item.quantity)), new Prisma.Decimal(0));
    const itemDiscount = input.items.reduce((sum, item) => sum.plus(item.discount ?? 0), new Prisma.Decimal(0));
    const total = subtotal.minus(itemDiscount).minus(input.orderDiscount ?? 0).plus(input.tax ?? 0);
    if (new Prisma.Decimal(input.payment.amount).lt(total)) throw new AppError(400, 'PAYMENT_TOO_SMALL', 'Payment amount is less than the sale total.');
    const sale = await tx.sale.create({ data: { invoiceNumber: await nextNumber(tx, 'sale', 'SAL'), cashierId, subtotal, itemDiscount, orderDiscount: input.orderDiscount ?? 0, tax: input.tax ?? 0, total, paidAmount: input.payment.amount, changeAmount: new Prisma.Decimal(input.payment.amount).minus(total) } });

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      const batches = await tx.$queryRaw<Array<{ id: string; availableQuantity: number; purchasePrice: Prisma.Decimal }>>`
        SELECT id, "availableQuantity", "purchasePrice" FROM "InventoryBatch"
        WHERE "productId" = ${item.productId}::uuid AND status = 'ACTIVE' AND "expiryDate" >= CURRENT_DATE AND "availableQuantity" > 0
        ORDER BY "expiryDate" ASC FOR UPDATE`;
      if (batches.reduce((sum, batch) => sum + batch.availableQuantity, 0) < item.quantity) throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient inventory for ${product.name}.`);
      const saleItem = await tx.saleItem.create({ data: { saleId: sale.id, productId: product.id, productNameSnapshot: product.name, quantity: item.quantity, unitPrice: product.sellingPrice, discount: item.discount ?? 0, subtotal: new Prisma.Decimal(product.sellingPrice).times(item.quantity).minus(item.discount ?? 0) } });
      let remaining = item.quantity;
      for (const batch of batches) {
        if (!remaining) break;
        const used = Math.min(batch.availableQuantity, remaining);
        const after = batch.availableQuantity - used;
        await tx.inventoryBatch.update({ where: { id: batch.id }, data: { availableQuantity: after, status: after === 0 ? 'DEPLETED' : 'ACTIVE' } });
        await tx.saleItemBatch.create({ data: { saleItemId: saleItem.id, batchId: batch.id, quantity: used, unitCost: batch.purchasePrice } });
        await tx.inventoryMovement.create({ data: { productId: product.id, batchId: batch.id, type: 'SALE', quantity: -used, quantityBefore: batch.availableQuantity, quantityAfter: after, referenceType: 'SALE', referenceId: sale.id, createdById: cashierId } });
        remaining -= used;
      }
    }
    await tx.payment.create({ data: { saleId: sale.id, ...input.payment } });
    await tx.auditLog.create({ data: { userId: cashierId, action: 'COMPLETE_SALE', entityType: 'Sale', entityId: sale.id, newData: { invoiceNumber: sale.invoiceNumber, total: total.toString() } } });
    return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { cashier: { select: { name: true } }, items: true, payments: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

