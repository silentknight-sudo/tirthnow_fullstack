-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "experience_kind" ADD VALUE 'puja';
ALTER TYPE "experience_kind" ADD VALUE 'path';
ALTER TYPE "experience_kind" ADD VALUE 'jyotish';
ALTER TYPE "experience_kind" ADD VALUE 'palmistry';
ALTER TYPE "experience_kind" ADD VALUE 'astrology';

-- AlterEnum
ALTER TYPE "vendor_type" ADD VALUE 'pandit';
