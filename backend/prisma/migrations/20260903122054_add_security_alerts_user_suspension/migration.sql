-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "patterns" TEXT[],
    "inputText" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_alerts_userId_idx" ON "security_alerts"("userId");

-- CreateIndex
CREATE INDEX "security_alerts_resolved_idx" ON "security_alerts"("resolved");

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
