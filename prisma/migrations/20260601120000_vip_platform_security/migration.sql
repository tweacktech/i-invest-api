-- User display name
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

-- Platform withdrawal gate
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "requireActiveInvestmentForWithdrawal" BOOLEAN NOT NULL DEFAULT true;

-- VIP level definitions
CREATE TABLE IF NOT EXISTS "vip_levels" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "levelName" TEXT NOT NULL,
    "levelDescription" TEXT,
    "minInvestmentRequired" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minTeamMembers" INTEGER NOT NULL DEFAULT 0,
    "minCommissionEarned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dividendRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "weeklySalary" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "membersUnlockCount" INTEGER NOT NULL DEFAULT 0,
    "maxWithdrawalPercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vip_levels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vip_levels_level_key" ON "vip_levels"("level");

-- Per-user VIP progression
CREATE TABLE IF NOT EXISTS "vip_progression" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentVipLevel" INTEGER NOT NULL DEFAULT 0,
    "investmentProgress" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "investmentTarget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "teamMembersProgress" INTEGER NOT NULL DEFAULT 0,
    "teamMembersTarget" INTEGER NOT NULL DEFAULT 0,
    "commissionProgress" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "commissionTarget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "levelsCompleted" INTEGER NOT NULL DEFAULT 0,
    "levelsCompletedAt" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "eligibleForPromotionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vip_progression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vip_progression_userId_key" ON "vip_progression"("userId");

ALTER TABLE "vip_progression" DROP CONSTRAINT IF EXISTS "vip_progression_userId_fkey";
ALTER TABLE "vip_progression" ADD CONSTRAINT "vip_progression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VIP benefits ledger
CREATE TABLE IF NOT EXISTS "vip_benefits_earned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vipLevel" INTEGER NOT NULL,
    "benefitType" TEXT NOT NULL,
    "benefitAmount" DECIMAL(18,2) NOT NULL,
    "benefitPercentage" DECIMAL(5,2),
    "earnedFromDate" TIMESTAMP(3),
    "earnedToDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "claimedAt" TIMESTAMP(3),
    "claimedToAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_benefits_earned_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vip_benefits_earned_userId_idx" ON "vip_benefits_earned"("userId");
CREATE INDEX IF NOT EXISTS "vip_benefits_earned_status_idx" ON "vip_benefits_earned"("status");

ALTER TABLE "vip_benefits_earned" DROP CONSTRAINT IF EXISTS "vip_benefits_earned_userId_fkey";
ALTER TABLE "vip_benefits_earned" ADD CONSTRAINT "vip_benefits_earned_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
