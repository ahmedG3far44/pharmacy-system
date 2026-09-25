import type { Prisma, PrismaClient } from '@prisma/client';

export async function nextNumber(db: Prisma.TransactionClient | PrismaClient, model: 'sale'|'purchase'|'saleReturn', prefix: string) {
  const year = new Date().getFullYear();
  const count = await (db[model] as any).count();
  return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
}

