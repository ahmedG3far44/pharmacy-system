import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ok, page, pagination } from '../lib/http.js';
import { authorize } from '../middleware/auth.js';
import { productSearchFilter } from '../lib/product-search.js';

export const catalogRouter = Router();
const productSchema = z.object({
  name: z.string().min(2), genericName: z.string().optional().nullable(), barcode: z.string().min(4), sku: z.string().min(2),
  categoryId: z.string().uuid(), manufacturerId: z.string().uuid().optional().nullable(), strength: z.string().optional().nullable(), dosageForm: z.string().optional().nullable(), description: z.string().optional().nullable(),
  sellingPrice: z.coerce.number().nonnegative(), defaultPurchasePrice: z.coerce.number().nonnegative(), prescriptionRequired: z.boolean().default(false), minimumStock: z.coerce.number().int().nonnegative(), isActive: z.boolean().default(true),
});

catalogRouter.get('/products', authorize('product:view'), async (req, res) => {
  const { page: current, limit } = pagination(req.query);
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
  const where: Prisma.ProductWhereInput = { categoryId, ...(req.query.active === 'false' ? {} : { isActive: true }), ...productSearchFilter(req.query.search) };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, skip: (current - 1) * limit, take: limit, include: { category: true, manufacturer: true, batches: { where: { status: 'ACTIVE', expiryDate: { gte: new Date() } }, select: { availableQuantity: true } } }, orderBy: { name: 'asc' } }),
    prisma.product.count({ where }),
  ]);
  const mapped = items.map(({ batches, ...product }) => {
    const availableQuantity = batches.reduce((sum, batch) => sum + batch.availableQuantity, 0);
    if (req.auth!.role === 'CASHIER') {
      const { defaultPurchasePrice: _hiddenCost, ...cashierProduct } = product;
      return { ...cashierProduct, availableQuantity };
    }
    return { ...product, availableQuantity };
  });
  page(res, mapped, total, current, limit);
});

catalogRouter.post('/products', authorize('product:create'), async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({ data });
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: 'CREATE_PRODUCT', entityType: 'Product', entityId: product.id, newData: product as any } });
  ok(res, product, 201);
});

catalogRouter.patch('/products/:id', authorize('product:update'), async (req, res) => {
  const data = productSchema.partial().parse(req.body);
  const previous = await prisma.product.findUniqueOrThrow({ where: { id: String(req.params.id) } });
  const product = await prisma.product.update({ where: { id: String(req.params.id) }, data });
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: previous.sellingPrice.toString() !== product.sellingPrice.toString() ? 'CHANGE_PRODUCT_PRICE' : 'UPDATE_PRODUCT', entityType: 'Product', entityId: product.id, previousData: previous as any, newData: product as any } });
  ok(res, product);
});

catalogRouter.delete('/products/:id', authorize('product:archive'), async (req, res) => ok(res, await prisma.product.update({ where: { id: String(req.params.id) }, data: { isActive: false } })));

catalogRouter.get('/categories', authorize('product:view'), async (_req, res) => ok(res, await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })));
catalogRouter.post('/categories', authorize('product:create'), async (req, res) => ok(res, await prisma.category.create({ data: z.object({ name: z.string().min(2), description: z.string().optional() }).parse(req.body) }), 201));
catalogRouter.get('/manufacturers', authorize('product:view'), async (_req, res) => ok(res, await prisma.manufacturer.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })));
catalogRouter.post('/manufacturers', authorize('product:create'), async (req, res) => ok(res, await prisma.manufacturer.create({ data: z.object({ name: z.string().min(2), phone: z.string().optional(), country: z.string().optional() }).parse(req.body) }), 201));

catalogRouter.get('/suppliers', authorize('supplier:view'), async (_req, res) => ok(res, await prisma.supplier.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { purchases: true } } } })));
catalogRouter.post('/suppliers', authorize('supplier:create'), async (req, res) => {
  const data = z.object({ name: z.string().min(2), phone: z.string().min(6), email: z.string().email().optional().or(z.literal('')), address: z.string().optional(), contactPerson: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  ok(res, await prisma.supplier.create({ data }), 201);
});
catalogRouter.patch('/suppliers/:id', authorize('supplier:update'), async (req, res) => ok(res, await prisma.supplier.update({ where: { id: String(req.params.id) }, data: z.object({ name: z.string().min(2).optional(), phone: z.string().min(6).optional(), email: z.string().email().optional().nullable(), address: z.string().optional().nullable(), isActive: z.boolean().optional() }).parse(req.body) })));
