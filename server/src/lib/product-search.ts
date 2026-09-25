import { Prisma } from '@prisma/client';

export function productSearchFilter(rawSearch: unknown): Prisma.ProductWhereInput {
  const search = String(rawSearch ?? '').trim().slice(0, 100);
  if (!search) return {};

  const textMatch = search.length < 3
    ? { startsWith: search, mode: Prisma.QueryMode.insensitive }
    : { contains: search, mode: Prisma.QueryMode.insensitive };

  return {
    OR: [
      { barcode: { equals: search } },
      { sku: { equals: search, mode: Prisma.QueryMode.insensitive } },
      { barcode: { startsWith: search } },
      { sku: textMatch },
      { name: textMatch },
      { genericName: textMatch },
    ],
  };
}
