-- Persisted human review for uncertain product matches. A pending review
-- blocks its sync run; an accepted candidate becomes a price change, a
-- rejected one becomes a new product.
CREATE TABLE "match_reviews" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "normalized" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "match_reviews_syncRunId_status_idx" ON "match_reviews"("syncRunId", "status");
CREATE INDEX "match_reviews_status_idx" ON "match_reviews"("status");

ALTER TABLE "match_reviews"
    ADD CONSTRAINT "match_reviews_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
