-- Product text search uses PostgreSQL's trigram indexes for fast partial matching.
-- Exact barcode and SKU lookups continue to use their unique B-tree indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_genericName_trgm_idx" ON "Product" USING GIN ("genericName" gin_trgm_ops);
CREATE INDEX "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX "Product_barcode_pattern_idx" ON "Product" ("barcode" text_pattern_ops);
CREATE INDEX "Product_isActive_name_id_idx" ON "Product"("isActive", "name", "id");
