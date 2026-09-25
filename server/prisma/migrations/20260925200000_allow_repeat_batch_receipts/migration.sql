-- A manufacturer batch can arrive in more than one purchase receipt.
-- Inventory remains traceable by its unique receipt row and purchaseItemId.
DROP INDEX "InventoryBatch_productId_batchNumber_key";
CREATE INDEX "InventoryBatch_productId_batchNumber_idx" ON "InventoryBatch"("productId", "batchNumber");
