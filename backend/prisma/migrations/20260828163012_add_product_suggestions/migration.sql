-- CreateTable
CREATE TABLE "product_suggestions" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "suggestedData" JSONB NOT NULL,
    "userEmail" TEXT NOT NULL,
    "comment" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_suggestions_productId_idx" ON "product_suggestions"("productId");
