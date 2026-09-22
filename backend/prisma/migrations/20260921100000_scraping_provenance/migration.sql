-- Preserve the origin of each published offer. Existing historical records
-- deliberately remain NULL because their per-offer provenance is unknown.
ALTER TABLE "price_entries"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "seller" TEXT,
  ADD COLUMN "scrapedAt" TIMESTAMP(3);

CREATE INDEX "price_entries_source_idx" ON "price_entries"("source");
CREATE INDEX "price_entries_scrapedAt_idx" ON "price_entries"("scrapedAt");
