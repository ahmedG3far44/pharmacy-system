import { randomUUID } from 'node:crypto';
import {
  BatchStatus,
  MovementType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  Role,
  SaleStatus,
} from '@prisma/client';
import { hashPassword } from '../src/lib/security.js';

const prisma = new PrismaClient();
const PRODUCT_COUNT = 5_000;
const BATCHES_PER_PRODUCT = 2;
const SALE_COUNT = 25_000;
const DAY_MS = 86_400_000;

const categoryNames = [
  'Pain Relief', 'Antibiotics', 'Cold & Flu', 'Vitamins & Supplements',
  'Digestive Health', 'Skin Care', 'Personal Care', 'Medical Supplies',
];
const manufacturerNames = ['GSK', 'Sanofi', 'Eva Pharma', 'Hikma', 'Pfizer', 'Novartis', 'Bayer', 'AstraZeneca'];
const genericNames = ['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Cetirizine', 'Omeprazole', 'Metformin', 'Azithromycin', 'Diclofenac'];
const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Cream', 'Drops', 'Sachet'];

async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, chunkSize = 1_000) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    await insert(rows.slice(start, start + chunkSize));
  }
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.saleReturnItem.deleteMany(),
    prisma.saleReturn.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.saleItemBatch.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.inventoryBatch.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.manufacturer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.session.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  console.log('Resetting database for the medium data set…');
  await resetDatabase();

  const adminId = randomUUID();
  const pharmacistId = randomUUID();
  const cashierId = randomUUID();
  const passwordHashes = await Promise.all([
    hashPassword('Admin@123'),
    hashPassword('Pharmacist@123'),
    hashPassword('Cashier@123'),
  ]);
  await prisma.user.createMany({ data: [
    { id: adminId, name: 'Ahmed Admin', phone: '+201000000001', passwordHash: passwordHashes[0], role: Role.ADMIN },
    { id: pharmacistId, name: 'Sara Pharmacist', phone: '+201000000002', passwordHash: passwordHashes[1], role: Role.PHARMACIST },
    { id: cashierId, name: 'Mohamed Cashier', phone: '+201000000003', passwordHash: passwordHashes[2], role: Role.CASHIER },
  ] });

  const categoryIds = categoryNames.map(() => randomUUID());
  const manufacturerIds = manufacturerNames.map(() => randomUUID());
  await prisma.category.createMany({ data: categoryNames.map((name, index) => ({ id: categoryIds[index], name })) });
  await prisma.manufacturer.createMany({ data: manufacturerNames.map((name, index) => ({ id: manufacturerIds[index], name, country: index < 2 ? 'United Kingdom' : 'Egypt' })) });
  await prisma.supplier.create({ data: { name: 'Medium Seed Distribution', phone: '+2035002001', address: 'Alexandria' } });
  await prisma.setting.createMany({ data: [
    { key: 'pharmacyName', value: 'Demo Pharmacy' },
    { key: 'currency', value: 'EGP' },
    { key: 'currencySymbol', value: 'EGP' },
    { key: 'defaultTax', value: 0 },
    { key: 'expiryWarningDays', value: 30 },
    { key: 'receiptFooter', value: 'Thank you for choosing Demo Pharmacy' },
  ] });

  console.log(`Generating ${PRODUCT_COUNT.toLocaleString()} products…`);
  const productRows: Prisma.ProductCreateManyInput[] = [];
  const productPrices: number[] = [];
  for (let index = 0; index < PRODUCT_COUNT; index++) {
    const sellingPrice = 12 + (index % 240) * 1.35;
    productPrices.push(Number(sellingPrice.toFixed(2)));
    productRows.push({
      id: randomUUID(),
      name: `Medicine ${String(index + 1).padStart(5, '0')} ${genericNames[index % genericNames.length]}`,
      genericName: genericNames[index % genericNames.length],
      barcode: `6222${String(index + 1).padStart(9, '0')}`,
      sku: `MED-${String(index + 1).padStart(6, '0')}`,
      categoryId: categoryIds[index % categoryIds.length],
      manufacturerId: manufacturerIds[index % manufacturerIds.length],
      strength: `${50 + (index % 20) * 25}mg`,
      dosageForm: dosageForms[index % dosageForms.length],
      sellingPrice: productPrices[index],
      defaultPurchasePrice: Number((productPrices[index] * 0.72).toFixed(2)),
      prescriptionRequired: index % 7 === 0,
      minimumStock: 25 + (index % 25),
      isActive: true,
    });
  }
  await insertInChunks(productRows, (data) => prisma.product.createMany({ data }));

  console.log(`Generating ${(PRODUCT_COUNT * BATCHES_PER_PRODUCT).toLocaleString()} inventory batches…`);
  type BatchState = { id: string; productId: string; purchasePrice: number; initial: number; available: number };
  const batchStates: BatchState[] = [];
  for (let productIndex = 0; productIndex < PRODUCT_COUNT; productIndex++) {
    for (let batchIndex = 0; batchIndex < BATCHES_PER_PRODUCT; batchIndex++) {
      batchStates.push({
        id: randomUUID(),
        productId: productRows[productIndex].id!,
        purchasePrice: Number((productPrices[productIndex] * (batchIndex === 0 ? 0.7 : 0.74)).toFixed(2)),
        initial: 250,
        available: 250,
      });
    }
  }

  const sales: Prisma.SaleCreateManyInput[] = [];
  const saleItems: Prisma.SaleItemCreateManyInput[] = [];
  const allocations: Prisma.SaleItemBatchCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const saleMovements: Prisma.InventoryMovementCreateManyInput[] = [];

  console.log(`Generating ${SALE_COUNT.toLocaleString()} historical sales…`);
  for (let saleIndex = 0; saleIndex < SALE_COUNT; saleIndex++) {
    const saleId = randomUUID();
    const lineCount = 1 + (saleIndex % 3);
    const daysAgo = Math.floor(((SALE_COUNT - 1 - saleIndex) / SALE_COUNT) * 365);
    const createdAt = new Date(Date.now() - daysAgo * DAY_MS - (saleIndex % 1_440) * 60_000);
    let total = 0;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const productIndex = (saleIndex * 17 + lineIndex * 997) % PRODUCT_COUNT;
      const quantity = 1 + ((saleIndex + lineIndex) % 3);
      const unitPrice = productPrices[productIndex];
      const subtotal = Number((unitPrice * quantity).toFixed(2));
      const saleItemId = randomUUID();
      const batchState = batchStates[productIndex * BATCHES_PER_PRODUCT + ((saleIndex + lineIndex) % BATCHES_PER_PRODUCT)];
      const before = batchState.available;
      batchState.available -= quantity;
      if (batchState.available < 0) throw new Error(`Generated sales exceed stock for product ${productIndex + 1}.`);

      saleItems.push({
        id: saleItemId,
        saleId,
        productId: productRows[productIndex].id!,
        productNameSnapshot: productRows[productIndex].name,
        quantity,
        unitPrice,
        discount: 0,
        subtotal,
      });
      allocations.push({ id: randomUUID(), saleItemId, batchId: batchState.id, quantity, unitCost: batchState.purchasePrice });
      saleMovements.push({
        id: randomUUID(),
        productId: batchState.productId,
        batchId: batchState.id,
        type: MovementType.SALE,
        quantity: -quantity,
        quantityBefore: before,
        quantityAfter: batchState.available,
        referenceType: 'SALE',
        referenceId: saleId,
        reason: 'Historical medium seed sale',
        createdById: saleIndex % 5 === 0 ? pharmacistId : cashierId,
        createdAt,
      });
      total += subtotal;
    }

    total = Number(total.toFixed(2));
    sales.push({
      id: saleId,
      invoiceNumber: `INV-M-${String(saleIndex + 1).padStart(8, '0')}`,
      cashierId: saleIndex % 5 === 0 ? pharmacistId : cashierId,
      status: SaleStatus.COMPLETED,
      subtotal: total,
      itemDiscount: 0,
      orderDiscount: 0,
      tax: 0,
      total,
      paidAmount: total,
      changeAmount: 0,
      paymentStatus: PaymentStatus.PAID,
      createdAt,
    });
    payments.push({
      id: randomUUID(),
      saleId,
      method: [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MOBILE_WALLET][saleIndex % 3],
      amount: total,
      createdAt,
    });
  }

  const receivedAt = new Date(Date.now() - 400 * DAY_MS);
  const inventoryBatches: Prisma.InventoryBatchCreateManyInput[] = batchStates.map((batch, index) => ({
    id: batch.id,
    productId: batch.productId,
    batchNumber: `B${String(index + 1).padStart(7, '0')}`,
    purchasePrice: batch.purchasePrice,
    sellingPrice: productPrices[Math.floor(index / BATCHES_PER_PRODUCT)],
    initialQuantity: batch.initial,
    availableQuantity: batch.available,
    manufacturingDate: new Date(receivedAt.getTime() - 180 * DAY_MS),
    expiryDate: new Date(Date.now() + (180 + (index % 720)) * DAY_MS),
    receivedAt,
    status: batch.available === 0 ? BatchStatus.DEPLETED : BatchStatus.ACTIVE,
  }));
  const purchaseMovements: Prisma.InventoryMovementCreateManyInput[] = batchStates.map((batch) => ({
    id: randomUUID(),
    productId: batch.productId,
    batchId: batch.id,
    type: MovementType.PURCHASE,
    quantity: batch.initial,
    quantityBefore: 0,
    quantityAfter: batch.initial,
    referenceType: 'SEED',
    reason: 'Medium seed opening inventory',
    createdById: pharmacistId,
    createdAt: receivedAt,
  }));

  await insertInChunks(inventoryBatches, (data) => prisma.inventoryBatch.createMany({ data }));
  await insertInChunks(sales, (data) => prisma.sale.createMany({ data }));
  await insertInChunks(saleItems, (data) => prisma.saleItem.createMany({ data }), 2_000);
  await insertInChunks(allocations, (data) => prisma.saleItemBatch.createMany({ data }), 2_000);
  await insertInChunks(payments, (data) => prisma.payment.createMany({ data }), 2_000);
  await insertInChunks(purchaseMovements, (data) => prisma.inventoryMovement.createMany({ data }), 2_000);
  await insertInChunks(saleMovements, (data) => prisma.inventoryMovement.createMany({ data }), 2_000);

  console.log(`Seeded ${productRows.length.toLocaleString()} products, ${inventoryBatches.length.toLocaleString()} batches and ${sales.length.toLocaleString()} historical sales.`);
  console.log('Admin: +201000000001 / Admin@123');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
