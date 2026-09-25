import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ok, page, pagination } from '../lib/http.js';
import { authorize } from '../middleware/auth.js';
import { adjustInventory } from '../services/inventory.service.js';
import { productSearchFilter } from '../lib/product-search.js';

export const inventoryRouter = Router();

inventoryRouter.get('/batches', authorize('inventory:view','inventory:availability'), async (req, res) => {
  const { page: current, limit } = pagination(req.query);
  const search = String(req.query.search ?? '').trim().slice(0, 100);
  const where: Prisma.InventoryBatchWhereInput = {
    ...(req.query.status ? { status: String(req.query.status) as any } : {}),
    ...(req.query.expiring === 'true' ? { expiryDate: { gte: new Date(), lte: new Date(Date.now() + 90 * 86400000) } } : {}),
    ...(search ? { OR: [
      { batchNumber: search.length < 3 ? { startsWith: search, mode: 'insensitive' } : { contains: search, mode: 'insensitive' } },
      { product: { is: productSearchFilter(search) } },
    ] } : {}),
  };
  const [items, total] = await prisma.$transaction([prisma.inventoryBatch.findMany({ where, include: { product: { select: { name: true, sku: true, minimumStock: true } } }, orderBy: { expiryDate: 'asc' }, skip: (current - 1) * limit, take: limit }), prisma.inventoryBatch.count({ where })]);
  page(res, items, total, current, limit);
});

inventoryRouter.get('/summary', authorize('inventory:view','inventory:availability'), async (req, res) => {
  const { page: current, limit } = pagination(req.query);
  const where: Prisma.ProductWhereInput = { isActive: true, ...productSearchFilter(req.query.search) };
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { category: true, batches: { where: { status: 'ACTIVE', expiryDate: { gte: new Date() } } } }, orderBy: { name: 'asc' }, skip: (current - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);
  const mapped = products.map(({ batches, ...product }) => {
    const availableQuantity = batches.reduce((sum, batch) => sum + batch.availableQuantity, 0);
    const base = { ...product, availableQuantity, stockStatus: availableQuantity === 0 ? 'OUT_OF_STOCK' : availableQuantity <= product.minimumStock ? 'LOW_STOCK' : 'IN_STOCK' };
    return req.auth!.role === 'CASHIER' ? base : { ...base, stockValue: batches.reduce((sum, batch) => sum + Number(batch.purchasePrice) * batch.availableQuantity, 0) };
  });
  page(res, mapped, total, current, limit);
});

inventoryRouter.get('/movements', authorize('inventory:view'), async (req, res) => {
  const { page: current, limit } = pagination(req.query);
  const [items, total] = await prisma.$transaction([prisma.inventoryMovement.findMany({ include: { product: { select: { name: true } }, batch: { select: { batchNumber: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (current - 1) * limit, take: limit }), prisma.inventoryMovement.count()]);
  page(res, items, total, current, limit);
});

inventoryRouter.post('/adjust', authorize('inventory:adjust'), async (req, res) => {
  const body = z.object({ batchId: z.string().uuid(), delta: z.number().int().refine((n) => n !== 0), reason: z.string().min(3), kind: z.enum(['DAMAGED','EXPIRED']).optional() }).parse(req.body);
  ok(res, await adjustInventory(body.batchId, body.delta, body.reason, req.auth!.userId, body.kind));
});
