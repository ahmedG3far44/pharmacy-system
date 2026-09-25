import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, ok, page, pagination } from '../lib/http.js';
import { nextNumber } from '../lib/numbers.js';
import { authorize } from '../middleware/auth.js';
import { completeSale } from '../services/sale.service.js';
import { receivePurchase } from '../services/purchase.service.js';
import { allocateReturnToBatches, netSaleValues, salesDateRange, type SalesPeriod } from '../domain/sales.js';

export const operationsRouter = Router();

operationsRouter.get('/purchases', authorize('purchase:view'), async (req, res) => {
  const { page: current, limit } = pagination(req.query);
  const where = req.query.status ? { status: String(req.query.status) as any } : {};
  const [items, total] = await prisma.$transaction([prisma.purchase.findMany({ where, include: { supplier: true, createdBy: { select: { name: true } }, _count: { select: { items: true } } }, orderBy: { purchasedAt: 'desc' }, skip: (current - 1) * limit, take: limit }), prisma.purchase.count({ where })]);
  page(res, items, total, current, limit);
});

operationsRouter.post('/purchases', authorize('purchase:create'), async (req, res) => {
  const body = z.object({ supplierId: z.string().uuid(), supplierInvoiceNumber: z.string().optional(), discount: z.number().nonnegative().default(0), tax: z.number().nonnegative().default(0), notes: z.string().optional(), items: z.array(z.object({ productId: z.string().uuid(), batchNumber: z.string().min(2), quantity: z.number().int().positive(), purchasePrice: z.number().positive(), sellingPrice: z.number().positive(), expiryDate: z.coerce.date() })).min(1) }).parse(req.body);
  const subtotal = body.items.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0);
  const purchase = await prisma.purchase.create({ data: { purchaseNumber: await nextNumber(prisma, 'purchase', 'PUR'), supplierId: body.supplierId, supplierInvoiceNumber: body.supplierInvoiceNumber, subtotal, discount: body.discount, tax: body.tax, total: subtotal - body.discount + body.tax, notes: body.notes, createdById: req.auth!.userId, items: { create: body.items.map((item) => ({ ...item, subtotal: item.purchasePrice * item.quantity })) } }, include: { supplier: true, items: true } });
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: 'CREATE_PURCHASE', entityType: 'Purchase', entityId: purchase.id } });
  ok(res, purchase, 201);
});

operationsRouter.post('/purchases/:id/receive', authorize('purchase:receive'), async (req, res) => ok(res, await receivePurchase(String(req.params.id), req.auth!.userId)));
operationsRouter.post('/purchases/:id/cancel', authorize('purchase:create'), async (req, res) => {
  const purchase = await prisma.purchase.findUnique({ where: { id: String(req.params.id) } });
  if (!purchase || purchase.status !== 'DRAFT') throw new AppError(409, 'PURCHASE_NOT_DRAFT', 'Only draft purchases can be cancelled.');
  ok(res, await prisma.purchase.update({ where: { id: String(req.params.id) }, data: { status: 'CANCELLED' } }));
});

operationsRouter.get('/sales', authorize('sale:view:any','sale:view:own'), async (req, res) => {
  const { page: current, limit } = pagination(req.query);
  const ownOnly = !req.auth!.permissions.includes('*') && !req.auth!.permissions.includes('sale:view:any');
  const period = z.enum(['today','yesterday','month','last_month','three_months','six_months','year','specific','all']).catch('today').parse(req.query.period) as SalesPeriod;
  let range: { from: Date; to: Date };
  try { range = salesDateRange(period, typeof req.query.date === 'string' ? req.query.date : undefined); }
  catch (error) { throw new AppError(400, 'INVALID_DATE', error instanceof Error ? error.message : 'Invalid date.'); }
  const accessWhere: Prisma.SaleWhereInput = { ...(ownOnly ? { cashierId: req.auth!.userId } : {}), createdAt: { gte: range.from, lt: range.to }, ...(req.query.invoice ? { invoiceNumber: { contains: String(req.query.invoice), mode: 'insensitive' } } : {}) };
  const reportingWhere: Prisma.SaleWhereInput = { ...accessWhere, status: { not: 'VOIDED' } };
  const [rawItems, total, gross, refunds, soldItems, returnedItems] = await Promise.all([
    prisma.sale.findMany({ where: accessWhere, include: { cashier: { select: { name: true } }, payments: true, returns: { select: { refundAmount: true } }, items: { select: { quantity: true, returnItems: { select: { quantity: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (current - 1) * limit, take: limit }),
    prisma.sale.count({ where: accessWhere }),
    prisma.sale.aggregate({ where: reportingWhere, _sum: { total: true }, _count: true }),
    prisma.saleReturn.aggregate({ where: { sale: reportingWhere }, _sum: { refundAmount: true }, _count: true }),
    prisma.saleItem.aggregate({ where: { sale: reportingWhere }, _sum: { quantity: true } }),
    prisma.saleReturnItem.aggregate({ where: { return: { sale: reportingWhere } }, _sum: { quantity: true } }),
  ]);
  const items = rawItems.map((sale) => {
    const returnedAmount = sale.returns.reduce((sum, record) => sum + Number(record.refundAmount), 0);
    const soldQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const returnedQuantity = sale.items.reduce((sum, item) => sum + item.returnItems.reduce((inner, returned) => inner + returned.quantity, 0), 0);
    const { returns: _returns, items: _items, ...base } = sale;
    return { ...base, ...netSaleValues(Number(sale.total), returnedAmount, soldQuantity, returnedQuantity), grossTotal: Number(sale.total) };
  });
  const grossRevenue = Number(gross._sum.total ?? 0);
  const refundedAmount = Number(refunds._sum.refundAmount ?? 0);
  const netRevenue = Math.max(0, grossRevenue - refundedAmount);
  ok(res, { items, pagination: { page: current, limit, total, pages: Math.ceil(total / limit) }, range, summary: { transactions: gross._count, grossRevenue, refundedAmount, netRevenue, itemsSold: Math.max(0, (soldItems._sum.quantity ?? 0) - (returnedItems._sum.quantity ?? 0)), returns: refunds._count, averageOrder: gross._count ? netRevenue / gross._count : 0 } });
});

operationsRouter.get('/sales/:id', authorize('sale:view:any','sale:view:own'), async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: String(req.params.id) }, include: { cashier: { select: { name: true } }, items: { include: { batches: { include: { batch: { select: { batchNumber: true } } } }, returnItems: true } }, payments: true, returns: { include: { items: true } } } });
  if (!sale) throw new AppError(404, 'SALE_NOT_FOUND', 'Sale not found.');
  if (!req.auth!.permissions.includes('*') && !req.auth!.permissions.includes('sale:view:any') && sale.cashierId !== req.auth!.userId) throw new AppError(403, 'FORBIDDEN', 'You may only view your own sales.');
  const returnedAmount = sale.returns.reduce((sum, record) => sum + Number(record.refundAmount), 0);
  const soldQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedQuantity = sale.items.reduce((sum, item) => sum + item.returnItems.reduce((inner, returned) => inner + returned.quantity, 0), 0);
  ok(res, { ...sale, ...netSaleValues(Number(sale.total), returnedAmount, soldQuantity, returnedQuantity), grossTotal: Number(sale.total) });
});

operationsRouter.post('/sales', authorize('sale:create'), async (req, res) => {
  const body = z.object({ items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), discount: z.number().nonnegative().optional() })).min(1), orderDiscount: z.number().nonnegative().optional(), tax: z.number().nonnegative().optional(), payment: z.object({ method: z.enum(['CASH','CARD','MOBILE_WALLET']), amount: z.number().positive(), reference: z.string().optional() }) }).parse(req.body);
  ok(res, await completeSale(body, req.auth!.userId), 201);
});

operationsRouter.post('/sales/:id/void', authorize('sale:void'), async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: String(req.params.id) }, include: { items: { include: { batches: true } } } });
  if (!sale || sale.status !== 'COMPLETED') throw new AppError(409, 'SALE_NOT_VOIDABLE', 'This sale cannot be voided.');
  const saleItems = sale.items;
  await prisma.$transaction(async (tx) => {
    for (const item of saleItems) for (const allocation of item.batches) {
      const batch = await tx.inventoryBatch.findUniqueOrThrow({ where: { id: allocation.batchId } });
      await tx.inventoryBatch.update({ where: { id: batch.id }, data: { availableQuantity: { increment: allocation.quantity }, status: 'ACTIVE' } });
      await tx.inventoryMovement.create({ data: { productId: item.productId, batchId: batch.id, type: 'VOID', quantity: allocation.quantity, quantityBefore: batch.availableQuantity, quantityAfter: batch.availableQuantity + allocation.quantity, referenceType: 'SALE', referenceId: sale.id, reason: 'Sale voided', createdById: req.auth!.userId } });
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'VOIDED', paymentStatus: 'REFUNDED' } });
    await tx.auditLog.create({ data: { userId: req.auth!.userId, action: 'VOID_SALE', entityType: 'Sale', entityId: sale.id } });
  });
  ok(res, { message: 'Sale voided and inventory restored.' });
});

operationsRouter.get('/returns', authorize('return:create'), async (_req, res) => ok(res, await prisma.saleReturn.findMany({ include: { sale: { select: { invoiceNumber: true } }, createdBy: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } })));

operationsRouter.post('/returns', authorize('return:create'), async (req, res) => {
  const body = z.object({ saleId: z.string().uuid(), reason: z.string().min(3), items: z.array(z.object({ saleItemId: z.string().uuid(), quantity: z.number().int().positive(), restocked: z.boolean().default(false) })).min(1) }).parse(req.body);
  if (new Set(body.items.map((item) => item.saleItemId)).size !== body.items.length) throw new AppError(400, 'DUPLICATE_RETURN_ITEM', 'Each sale item can only appear once in a return.');
  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: body.saleId }, include: { items: { include: { batches: { include: { batch: true } }, returnItems: true } } } });
    if (!sale || sale.status === 'VOIDED') throw new AppError(404, 'SALE_NOT_RETURNABLE', 'Sale not found or cannot be returned.');
    let refund = new Prisma.Decimal(0);
    const returnItems: Array<{ saleItemId: string; productId: string; quantity: number; refundAmount: Prisma.Decimal; restocked: boolean }> = [];
    for (const request of body.items) {
      const item = sale.items.find((value) => value.id === request.saleItemId);
      if (!item) throw new AppError(400, 'INVALID_RETURN_ITEM', 'Return item does not belong to this sale.');
      const alreadyReturned = item.returnItems.reduce((sum, value) => sum + value.quantity, 0);
      if (request.quantity > item.quantity - alreadyReturned) throw new AppError(409, 'RETURN_QUANTITY_EXCEEDED', 'Return quantity exceeds the remaining sold quantity.');
      const amount = new Prisma.Decimal(item.subtotal).div(item.quantity).times(request.quantity);
      refund = refund.plus(amount);
      returnItems.push({ saleItemId: item.id, productId: item.productId, quantity: request.quantity, refundAmount: amount, restocked: request.restocked });
    }

    const record = await tx.saleReturn.create({ data: { returnNumber: await nextNumber(tx, 'saleReturn', 'RET'), saleId: sale.id, createdById: req.auth!.userId, reason: body.reason, refundAmount: refund, items: { create: returnItems } } });

    for (const request of body.items) {
      if (!request.restocked) continue;
      const item = sale.items.find((value) => value.id === request.saleItemId)!;
      const previouslyRestocked = item.returnItems.filter((value) => value.restocked).reduce((sum, value) => sum + value.quantity, 0);
      let allocations: { batchId: string; quantity: number }[];
      try { allocations = allocateReturnToBatches(item.batches.map((allocation) => ({ batchId: allocation.batchId, quantity: allocation.quantity, expiryDate: allocation.batch.expiryDate })), request.quantity, previouslyRestocked); }
      catch { throw new AppError(409, 'RETURN_ALLOCATION_ERROR', 'Returned quantity could not be matched to its original inventory batches.'); }
      for (const allocation of allocations) {
        const batch = await tx.inventoryBatch.findUniqueOrThrow({ where: { id: allocation.batchId } });
        const after = batch.availableQuantity + allocation.quantity;
        await tx.inventoryBatch.update({ where: { id: batch.id }, data: { availableQuantity: after, status: batch.expiryDate < new Date() ? 'EXPIRED' : 'ACTIVE' } });
        await tx.inventoryMovement.create({ data: { productId: item.productId, batchId: batch.id, type: 'SALE_RETURN', quantity: allocation.quantity, quantityBefore: batch.availableQuantity, quantityAfter: after, referenceType: 'RETURN', referenceId: record.id, reason: body.reason, createdById: req.auth!.userId } });
      }
    }

    const totalReturned = (await tx.saleReturnItem.aggregate({ where: { saleItem: { saleId: sale.id } }, _sum: { quantity: true, refundAmount: true } }))._sum;
    const returnedQuantity = totalReturned.quantity ?? 0;
    const returnedAmount = totalReturned.refundAmount ?? new Prisma.Decimal(0);
    const totalSold = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const fullyReturned = returnedQuantity >= totalSold || returnedAmount.gte(sale.total);
    await tx.sale.update({ where: { id: sale.id }, data: { status: fullyReturned ? 'RETURNED' : 'PARTIALLY_RETURNED', paymentStatus: fullyReturned ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
    await tx.auditLog.create({ data: { userId: req.auth!.userId, action: 'CREATE_RETURN', entityType: 'SaleReturn', entityId: record.id, newData: { saleId: sale.id, refundAmount: refund.toString(), items: returnItems.map((item) => ({ saleItemId: item.saleItemId, quantity: item.quantity, restocked: item.restocked })) } } });
    return { ...record, sale: { id: sale.id, invoiceNumber: sale.invoiceNumber, grossTotal: Number(sale.total), returnedAmount: Number(returnedAmount), netTotal: Math.max(0, Number(sale.total) - Number(returnedAmount)) } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  ok(res, result, 201);
});
