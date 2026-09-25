import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, ok } from '../lib/http.js';
import { hashPassword, normalizePhone } from '../lib/security.js';
import { authorize, rolePermissions } from '../middleware/auth.js';
import { salesDateRange, type SalesPeriod } from '../domain/sales.js';

export const adminRouter = Router();

adminRouter.get('/dashboard', authorize('dashboard:view'), async (req, res) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const isCashier = req.auth!.role === 'CASHIER';
  const salesWhere = { createdAt: { gte: start }, status: { not: 'VOIDED' as const }, ...(isCashier ? { cashierId: req.auth!.userId } : {}) };
  const [sales, items, refunds, returnedItems, products, expiring, expired] = await Promise.all([
    prisma.sale.aggregate({ where: salesWhere, _sum: { total: true }, _count: true }),
    prisma.saleItem.aggregate({ where: { sale: salesWhere }, _sum: { quantity: true } }),
    prisma.saleReturn.aggregate({ where: { sale: salesWhere }, _sum: { refundAmount: true } }),
    prisma.saleReturnItem.aggregate({ where: { return: { sale: salesWhere } }, _sum: { quantity: true } }),
    prisma.product.findMany({ where: { isActive: true }, include: { batches: { where: { status: 'ACTIVE', expiryDate: { gte: new Date() } } } } }),
    prisma.inventoryBatch.count({ where: { status: 'ACTIVE', availableQuantity: { gt: 0 }, expiryDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } } }),
    prisma.inventoryBatch.count({ where: { OR: [{ status: 'EXPIRED' }, { expiryDate: { lt: new Date() }, availableQuantity: { gt: 0 } }] } }),
  ]);
  const stock = products.map((product) => ({ name: product.name, sku: product.sku, minimumStock: product.minimumStock, available: product.batches.reduce((sum, batch) => sum + batch.availableQuantity, 0) }));
  const profitRows = await prisma.saleItemBatch.findMany({ where: { saleItem: { sale: salesWhere } }, include: { saleItem: { select: { unitPrice: true } } } });
  const returnProfitRows = await prisma.saleReturnItem.findMany({ where: { return: { sale: salesWhere } }, include: { saleItem: { include: { batches: true } } } });
  const grossProfitBeforeReturns = profitRows.reduce((sum, row) => sum + (Number(row.saleItem.unitPrice) - Number(row.unitCost)) * row.quantity, 0);
  const returnedProfit = returnProfitRows.reduce((sum, row) => { const totalAllocated = row.saleItem.batches.reduce((value, allocation) => value + allocation.quantity, 0); const averageCost = totalAllocated ? row.saleItem.batches.reduce((value, allocation) => value + Number(allocation.unitCost) * allocation.quantity, 0) / totalAllocated : 0; return sum + Number(row.refundAmount) - averageCost * row.quantity; }, 0);
  const revenue = Math.max(0, Number(sales._sum.total ?? 0) - Number(refunds._sum.refundAmount ?? 0));
  const itemsSold = Math.max(0, (items._sum.quantity ?? 0) - (returnedItems._sum.quantity ?? 0));
  ok(res, { revenue, transactions: sales._count, itemsSold, ...(req.auth!.role === 'ADMIN' ? { grossProfit: Math.max(0, grossProfitBeforeReturns - returnedProfit) } : {}), lowStock: stock.filter((p) => p.available > 0 && p.available <= p.minimumStock), outOfStock: stock.filter((p) => p.available === 0), expiring, expired });
});

adminRouter.get('/reports/summary', authorize('report:sales','report:inventory'), async (req, res) => {
  const period = z.enum(['today','yesterday','month','last_month','three_months','six_months','year','specific']).catch('month').parse(req.query.period) as SalesPeriod;
  let range: { from: Date; to: Date };
  try { range = salesDateRange(period, typeof req.query.date === 'string' ? req.query.date : undefined); }
  catch (error) { throw new AppError(400, 'INVALID_DATE', error instanceof Error ? error.message : 'Invalid date.'); }
  const { from, to } = range;
  const salesWhere = { createdAt: { gte: from, lt: to }, status: { not: 'VOIDED' as const } };
  const [sales, refunds, payments, topProducts, returnedProducts, purchases] = await Promise.all([
    prisma.sale.aggregate({ where: salesWhere, _sum: { total: true }, _count: true }),
    prisma.saleReturn.aggregate({ where: { sale: salesWhere }, _sum: { refundAmount: true } }),
    prisma.payment.groupBy({ by: ['method'], where: { createdAt: { gte: from, lt: to } }, _sum: { amount: true }, _count: true }),
    prisma.saleItem.groupBy({ by: ['productId','productNameSnapshot'], where: { sale: salesWhere }, _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 8 }),
    prisma.saleReturnItem.groupBy({ by: ['productId'], where: { return: { sale: salesWhere } }, _sum: { quantity: true, refundAmount: true } }),
    prisma.purchase.aggregate({ where: { purchasedAt: { gte: from, lt: to }, status: 'RECEIVED' }, _sum: { total: true }, _count: true }),
  ]);
  const returnedByProduct = new Map(returnedProducts.map((item) => [item.productId, item]));
  const netTopProducts = topProducts.map((item) => { const returned = returnedByProduct.get(item.productId); return { ...item, _sum: { quantity: Math.max(0, (item._sum.quantity ?? 0) - (returned?._sum.quantity ?? 0)), subtotal: Math.max(0, Number(item._sum.subtotal ?? 0) - Number(returned?._sum.refundAmount ?? 0)) } }; }).filter((item) => item._sum.quantity > 0).sort((a, b) => b._sum.quantity - a._sum.quantity);
  const grossRevenue = Number(sales._sum.total ?? 0); const refundedAmount = Number(refunds._sum.refundAmount ?? 0); const revenue = Math.max(0, grossRevenue - refundedAmount);
  ok(res, { range: { from, to }, sales: { revenue, grossRevenue, refundedAmount, transactions: sales._count, averageOrder: sales._count ? revenue / sales._count : 0 }, payments, topProducts: netTopProducts, purchases: { total: Number(purchases._sum.total ?? 0), count: purchases._count } });
});

adminRouter.get('/users', authorize('user:manage'), async (_req, res) => ok(res, await prisma.user.findMany({ select: { id: true, name: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, _count: { select: { sales: true, audits: true } } }, orderBy: { name: 'asc' } })));
adminRouter.post('/users', authorize('user:manage'), async (req, res) => {
  const body = z.object({ name: z.string().min(2), phone: z.string().min(8), password: z.string().min(8), role: z.enum(['ADMIN','PHARMACIST','CASHIER']) }).parse(req.body);
  const user = await prisma.user.create({ data: { name: body.name, phone: normalizePhone(body.phone), passwordHash: await hashPassword(body.password), role: body.role } });
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: 'CREATE_USER', entityType: 'User', entityId: user.id, newData: { name: user.name, phone: user.phone, role: user.role } } });
  ok(res, { id: user.id, name: user.name, phone: user.phone, role: user.role, isActive: user.isActive }, 201);
});
adminRouter.patch('/users/:id', authorize('user:manage'), async (req, res) => {
  const body = z.object({ name: z.string().min(2).optional(), role: z.enum(['ADMIN','PHARMACIST','CASHIER']).optional(), isActive: z.boolean().optional(), password: z.string().min(8).optional() }).parse(req.body);
  const user = await prisma.user.update({ where: { id: String(req.params.id) }, data: { name: body.name, role: body.role, isActive: body.isActive, ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}) } });
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: body.role ? 'UPDATE_USER_ROLE' : 'UPDATE_USER', entityType: 'User', entityId: user.id, newData: { role: user.role, isActive: user.isActive } } });
  ok(res, { id: user.id, name: user.name, role: user.role, isActive: user.isActive });
});

adminRouter.get('/settings', authorize('dashboard:view'), async (_req, res) => { const settings = await prisma.setting.findMany(); ok(res, Object.fromEntries(settings.map((item) => [item.key, item.value]))); });
adminRouter.put('/settings', authorize('settings:manage'), async (req, res) => {
  const values = z.record(z.string(), z.unknown()).parse(req.body);
  await prisma.$transaction(Object.entries(values).map(([key, value]) => prisma.setting.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } })));
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: 'CHANGE_SETTINGS', entityType: 'Setting', newData: values as any } });
  ok(res, values);
});

adminRouter.get('/audit-logs', authorize('user:manage'), async (_req, res) => ok(res, await prisma.auditLog.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })));
adminRouter.get('/permissions', (_req, res) => ok(res, rolePermissions));
