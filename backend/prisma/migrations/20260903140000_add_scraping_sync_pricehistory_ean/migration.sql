-- AlterTable: add ean column to products
ALTER TABLE "products" ADD COLUMN "ean" TEXT;

-- CreateIndex: unique ean
CREATE UNIQUE INDEX "products_ean_key" ON "products"("ean");

-- CreateTable: price_history
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "priceEntryId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "available" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for price_history
CREATE INDEX "price_history_priceEntryId_idx" ON "price_history"("priceEntryId");
CREATE INDEX "price_history_recordedAt_idx" ON "price_history"("recordedAt");

-- AddForeignKey: price_history → price_entries
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_priceEntryId_fkey" FOREIGN KEY ("priceEntryId") REFERENCES "price_entries"("id") ON DELETE CASCADE;

-- CreateTable: sync_runs
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "productsNew" INTEGER NOT NULL DEFAULT 0,
    "pricesUpdated" INTEGER NOT NULL DEFAULT 0,
    "promotionsFound" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for sync_runs
CREATE INDEX "sync_runs_adapter_status_idx" ON "sync_runs"("adapter", "status");
CREATE INDEX "sync_runs_createdAt_idx" ON "sync_runs"("createdAt");

-- CreateTable: sync_configs
CREATE TABLE "sync_configs" (
    "id" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sourceType" TEXT NOT NULL DEFAULT 'scraper',
    "sourceUrl" TEXT,
    "cronSchedule" TEXT NOT NULL DEFAULT '0 6 * * *',
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "maxPages" INTEGER NOT NULL DEFAULT 50,
    "rateLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "respectRobotsTxt" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "sync_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique adapter in sync_configs
CREATE UNIQUE INDEX "sync_configs_adapter_key" ON "sync_configs"("adapter");
