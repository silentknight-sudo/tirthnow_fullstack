-- CreateEnum
CREATE TYPE "stay_kind" AS ENUM ('hotel', 'dharamshala');

-- CreateEnum
CREATE TYPE "coupon_kind" AS ENUM ('percent', 'flat');

-- AlterEnum
ALTER TYPE "kyc_doc_type" ADD VALUE 'driving_licence';

-- AlterEnum
ALTER TYPE "order_type" ADD VALUE 'product';

-- AlterEnum
ALTER TYPE "vehicle_class" ADD VALUE 'bike';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "vendor_type" ADD VALUE 'dharamshala';
ALTER TYPE "vendor_type" ADD VALUE 'store';

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "kind" "stay_kind" NOT NULL DEFAULT 'hotel';

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "city_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "price_paise" INTEGER NOT NULL,
    "mrp_paise" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "media_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "coupon_kind" NOT NULL,
    "percent_bps" INTEGER NOT NULL DEFAULT 0,
    "flat_paise" INTEGER NOT NULL DEFAULT 0,
    "min_order_paise" INTEGER NOT NULL DEFAULT 0,
    "max_discount_paise" INTEGER,
    "starts_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(3),
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_vendor_id_idx" ON "products"("vendor_id");

-- CreateIndex
CREATE INDEX "products_category_is_published_idx" ON "products"("category", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_vendor_id_code_key" ON "coupons"("vendor_id", "code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
