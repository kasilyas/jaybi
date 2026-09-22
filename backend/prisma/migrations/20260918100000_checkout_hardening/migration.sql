ALTER TABLE "pack_products" ADD COLUMN "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "pack_products" pp SET "discountPercent" = LEAST(100, GREATEST(0, COALESCE(p."discountPercent", 0))) FROM "packs" p WHERE p.id = pp."packId";
ALTER TABLE "orders" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "orders_userId_idempotencyKey_key" ON "orders"("userId", "idempotencyKey");
ALTER TABLE "order_items" ADD COLUMN "originalUnitPrice" DOUBLE PRECISION, ADD COLUMN "discountPercent" DOUBLE PRECISION;
