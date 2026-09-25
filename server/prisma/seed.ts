import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/security.js';
import { receivePurchase } from '../src/services/purchase.service.js';

const prisma = new PrismaClient();
const days = (value: number) => new Date(Date.now() + value * 86400000);

async function main() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.saleReturnItem.deleteMany(), prisma.saleReturn.deleteMany(), prisma.payment.deleteMany(), prisma.saleItemBatch.deleteMany(), prisma.saleItem.deleteMany(), prisma.sale.deleteMany(), prisma.inventoryMovement.deleteMany(), prisma.inventoryBatch.deleteMany(), prisma.purchaseItem.deleteMany(), prisma.purchase.deleteMany(), prisma.product.deleteMany(), prisma.category.deleteMany(), prisma.manufacturer.deleteMany(), prisma.supplier.deleteMany(), prisma.session.deleteMany(), prisma.setting.deleteMany(), prisma.user.deleteMany(),
  ]);

  const [admin, pharmacist, cashier] = await Promise.all([
    prisma.user.create({ data: { name: 'Ahmed Admin', phone: '+201000000001', passwordHash: await hashPassword('Admin@123'), role: 'ADMIN' } }),
    prisma.user.create({ data: { name: 'Sara Pharmacist', phone: '+201000000002', passwordHash: await hashPassword('Pharmacist@123'), role: 'PHARMACIST' } }),
    prisma.user.create({ data: { name: 'Mohamed Cashier', phone: '+201000000003', passwordHash: await hashPassword('Cashier@123'), role: 'CASHIER' } }),
  ]);
  const categoryNames = ['Pain Relief','Antibiotics','Cold & Flu','Vitamins & Supplements','Digestive Health','Skin Care','Personal Care','Medical Supplies'];
  const categories = await Promise.all(categoryNames.map((name) => prisma.category.create({ data: { name } })));
  const manufacturers = await Promise.all(['GSK','Sanofi','Eva Pharma','Hikma','Pfizer'].map((name, index) => prisma.manufacturer.create({ data: { name, country: index < 2 ? 'United Kingdom' : 'Egypt' } })));
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Alex Pharma Distribution', phone: '+2035001001', address: 'Alexandria' } }),
    prisma.supplier.create({ data: { name: 'Mediterranean Medical Supply', phone: '+2035001002', address: 'Alexandria' } }),
    prisma.supplier.create({ data: { name: 'Delta Pharmacy Supplies', phone: '+2035001003', address: 'Egypt' } }),
  ]);
  const productData = [
    ['Panadol Extra','Paracetamol + Caffeine','622100000001','MED-001',0,0,45,35,20,'500mg / 65mg','Tablet',false],
    ['Cataflam','Diclofenac Potassium','622100000002','MED-002',0,1,65,48,15,'50mg','Tablet',false],
    ['Augmentin','Amoxicillin / Clavulanic Acid','622100000003','MED-003',1,0,220,175,10,'1g','Tablet',true],
    ['Vitamin C','Ascorbic Acid','622100000004','VIT-001',3,2,95,70,20,'1000mg','Tablet',false],
    ['Strepsils','Amylmetacresol','622100000005','CLD-001',2,0,80,58,15,'','Lozenge',false],
    ['Antinal','Nifuroxazide','622100000006','DIG-001',4,2,55,40,12,'200mg','Capsule',false],
    ['Betadine','Povidone Iodine','622100000007','SUP-001',7,4,60,42,10,'10%','Solution',false],
    ['Medical Face Mask','','622100000008','SUP-002',7,3,5,2,30,'','Disposable',false],
    ['Brufen','Ibuprofen','622100000009','MED-004',0,1,75,52,15,'400mg','Tablet',false],
    ['Otrivin','Xylometazoline','622100000010','CLD-002',2,0,70,49,8,'0.1%','Nasal drops',false],
    ['Centrum','Multivitamins','622100000011','VIT-002',3,4,310,250,8,'','Tablet',false],
    ['Rennie','Calcium carbonate','622100000012','DIG-002',4,1,85,62,10,'','Chewable',false],
    ['Fucidin','Fusidic acid','622100000013','SKN-001',5,3,92,67,10,'2%','Cream',true],
    ['Nivea Soft','Moisturizing cream','622100000014','PC-001',6,0,125,90,8,'100ml','Cream',false],
    ['Cotton Roll','','622100000015','SUP-003',7,2,28,17,20,'100g','Medical supply',false],
    ['Zyrtec','Cetirizine','622100000016','CLD-003',2,4,90,66,10,'10mg','Tablet',false],
    ['Flagyl','Metronidazole','622100000017','MED-005',1,1,48,33,12,'500mg','Tablet',true],
    ['Oral Rehydration Salts','Electrolytes','622100000018','DIG-003',4,3,12,6,25,'','Sachet',false],
  ] as const;
  const products = [];
  for (const [name,genericName,barcode,sku,categoryIndex,makerIndex,sellingPrice,defaultPurchasePrice,minimumStock,strength,dosageForm,prescriptionRequired] of productData) {
    products.push(await prisma.product.create({ data: { name, genericName, barcode, sku, categoryId: categories[categoryIndex].id, manufacturerId: manufacturers[makerIndex].id, sellingPrice, defaultPurchasePrice, minimumStock, strength, dosageForm, prescriptionRequired } }));
  }

  for (let group = 0; group < 3; group++) {
    const selection = products.slice(group * 6, group * 6 + 6);
    const items = selection.map((product, index) => { const quantity = product.name === 'Strepsils' ? 5 : product.name === 'Medical Face Mask' ? 1 : 45 + index * 8; return { productId: product.id, batchNumber: `${product.sku.replace('-','')}-26${group}${index}`, quantity, purchasePrice: Number(product.defaultPurchasePrice), sellingPrice: Number(product.sellingPrice), expiryDate: product.name === 'Vitamin C' ? days(20) : days(180 + index * 35), subtotal: Number(product.defaultPurchasePrice) * quantity }; });
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const purchase = await prisma.purchase.create({ data: { purchaseNumber: `PUR-2026-${String(group + 1).padStart(6,'0')}`, supplierId: suppliers[group].id, subtotal, total: subtotal, createdById: pharmacist.id, purchasedAt: days(-20 + group * 6), items: { create: items } } });
    await receivePurchase(purchase.id, pharmacist.id);
  }
  const maskBatch = await prisma.inventoryBatch.findFirstOrThrow({ where: { productId: products[7].id } });
  await prisma.inventoryMovement.create({ data: { productId: products[7].id, batchId: maskBatch.id, type: 'ADJUSTMENT_OUT', quantity: -maskBatch.availableQuantity, quantityBefore: maskBatch.availableQuantity, quantityAfter: 0, reason: 'Cycle count correction', createdById: admin.id } });
  await prisma.inventoryBatch.update({ where: { id: maskBatch.id }, data: { availableQuantity: 0, status: 'DEPLETED' } });
  const expired = await prisma.inventoryBatch.create({ data: { productId: products[0].id, batchNumber: 'PAN-EXPIRED-01', purchasePrice: 32, sellingPrice: 43, initialQuantity: 10, availableQuantity: 10, expiryDate: days(-15), status: 'EXPIRED' } });
  await prisma.inventoryMovement.create({ data: { productId: products[0].id, batchId: expired.id, type: 'EXPIRED', quantity: -10, quantityBefore: 10, quantityAfter: 10, reason: 'Expired stock quarantined', createdById: pharmacist.id } });
  const damaged = await prisma.inventoryBatch.create({ data: { productId: products[14].id, batchNumber: 'COT-DMG-01', purchasePrice: 17, initialQuantity: 4, availableQuantity: 0, expiryDate: days(300), status: 'DAMAGED' } });
  await prisma.inventoryMovement.create({ data: { productId: products[14].id, batchId: damaged.id, type: 'DAMAGED', quantity: -4, quantityBefore: 4, quantityAfter: 0, reason: 'Packaging water damage', createdById: pharmacist.id } });

  await prisma.$transaction([
    prisma.setting.create({ data: { key: 'pharmacyName', value: 'Demo Pharmacy' } }),
    prisma.setting.create({ data: { key: 'currency', value: 'EGP' } }),
    prisma.setting.create({ data: { key: 'currencySymbol', value: 'EGP' } }),
    prisma.setting.create({ data: { key: 'defaultTax', value: 0 } }),
    prisma.setting.create({ data: { key: 'expiryWarningDays', value: 30 } }),
    prisma.setting.create({ data: { key: 'receiptFooter', value: 'Thank you for choosing Demo Pharmacy' } }),
  ]);
  console.log(`Seeded ${products.length} products, 3 purchases, 0 sales and 0 returns.`);
  console.log('Admin: +201000000001 / Admin@123');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
