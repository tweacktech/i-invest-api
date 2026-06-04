-- AlterEnum
ALTER TYPE "WalletTxnType" ADD VALUE IF NOT EXISTS 'WELFARE_FEE';

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "welfareEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "welfareWeeklyPrice" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "welfareHolidayDates" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "WelfarePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelfarePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WelfarePayment_userId_weekStart_key" ON "WelfarePayment"("userId", "weekStart");
CREATE INDEX IF NOT EXISTS "WelfarePayment_userId_idx" ON "WelfarePayment"("userId");

ALTER TABLE "WelfarePayment" DROP CONSTRAINT IF EXISTS "WelfarePayment_userId_fkey";
ALTER TABLE "WelfarePayment" ADD CONSTRAINT "WelfarePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
