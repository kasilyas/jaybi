-- AlterTable
ALTER TABLE "products" ADD COLUMN     "discountPercent" DOUBLE PRECISION,
ADD COLUMN     "flashSaleEndsAt" TIMESTAMP(3),
ADD COLUMN     "flashSaleLabel" TEXT,
ADD COLUMN     "flashSalePercent" DOUBLE PRECISION,
ADD COLUMN     "flashSaleStartsAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
