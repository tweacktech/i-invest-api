import { Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentStatus, Prisma, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

const DEFAULT_LEVELS: Array<{
  level: number;
  levelName: string;
  levelDescription: string;
  minInvestmentRequired: string;
  minTeamMembers: number;
  minCommissionEarned: string;
  dividendRate: string;
  weeklySalary: string;
  membersUnlockCount: number;
  maxWithdrawalPercent: string;
}> = [
  {
    level: 0,
    levelName: 'Member',
    levelDescription: 'Base tier — start your journey',
    minInvestmentRequired: '0',
    minTeamMembers: 0,
    minCommissionEarned: '0',
    dividendRate: '0',
    weeklySalary: '0',
    membersUnlockCount: 0,
    maxWithdrawalPercent: '20',
  },
  {
    level: 1,
    levelName: 'Bronze',
    levelDescription: 'Unlock team dividends and higher withdrawal cap',
    minInvestmentRequired: '50000',
    minTeamMembers: 3,
    minCommissionEarned: '5000',
    dividendRate: '1',
    weeklySalary: '2000',
    membersUnlockCount: 5,
    maxWithdrawalPercent: '30',
  },
  {
    level: 2,
    levelName: 'Silver',
    levelDescription: 'Growing network with weekly salary',
    minInvestmentRequired: '150000',
    minTeamMembers: 8,
    minCommissionEarned: '15000',
    dividendRate: '2',
    weeklySalary: '5000',
    membersUnlockCount: 10,
    maxWithdrawalPercent: '40',
  },
  {
    level: 3,
    levelName: 'Gold',
    levelDescription: 'Established investor and leader',
    minInvestmentRequired: '350000',
    minTeamMembers: 15,
    minCommissionEarned: '40000',
    dividendRate: '3',
    weeklySalary: '10000',
    membersUnlockCount: 20,
    maxWithdrawalPercent: '50',
  },
  {
    level: 4,
    levelName: 'Platinum',
    levelDescription: 'Premium benefits and member unlocks',
    minInvestmentRequired: '750000',
    minTeamMembers: 25,
    minCommissionEarned: '100000',
    dividendRate: '4',
    weeklySalary: '20000',
    membersUnlockCount: 35,
    maxWithdrawalPercent: '60',
  },
  {
    level: 5,
    levelName: 'Diamond',
    levelDescription: 'High-volume team builder',
    minInvestmentRequired: '1500000',
    minTeamMembers: 40,
    minCommissionEarned: '250000',
    dividendRate: '5',
    weeklySalary: '40000',
    membersUnlockCount: 50,
    maxWithdrawalPercent: '70',
  },
  {
    level: 6,
    levelName: 'Crown',
    levelDescription: 'Elite tier with enhanced dividends',
    minInvestmentRequired: '3000000',
    minTeamMembers: 60,
    minCommissionEarned: '500000',
    dividendRate: '6',
    weeklySalary: '75000',
    membersUnlockCount: 75,
    maxWithdrawalPercent: '80',
  },
  {
    level: 7,
    levelName: 'Imperial',
    levelDescription: 'Top performers — near-max withdrawal',
    minInvestmentRequired: '6000000',
    minTeamMembers: 90,
    minCommissionEarned: '1000000',
    dividendRate: '8',
    weeklySalary: '120000',
    membersUnlockCount: 100,
    maxWithdrawalPercent: '90',
  },
  {
    level: 8,
    levelName: 'Legend',
    levelDescription: 'Maximum VIP — full platform benefits',
    minInvestmentRequired: '12000000',
    minTeamMembers: 120,
    minCommissionEarned: '2500000',
    dividendRate: '10',
    weeklySalary: '200000',
    membersUnlockCount: 150,
    maxWithdrawalPercent: '100',
  },
];

@Injectable()
export class VipService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultLevels() {
    for (const row of DEFAULT_LEVELS) {
      await this.prisma.vIPLevel.upsert({
        where: { level: row.level },
        update: {
          levelName: row.levelName,
          levelDescription: row.levelDescription,
          minInvestmentRequired: row.minInvestmentRequired,
          minTeamMembers: row.minTeamMembers,
          minCommissionEarned: row.minCommissionEarned,
          dividendRate: row.dividendRate,
          weeklySalary: row.weeklySalary,
          membersUnlockCount: row.membersUnlockCount,
          maxWithdrawalPercent: row.maxWithdrawalPercent,
          isActive: true,
        },
        create: {
          level: row.level,
          levelName: row.levelName,
          levelDescription: row.levelDescription,
          minInvestmentRequired: row.minInvestmentRequired,
          minTeamMembers: row.minTeamMembers,
          minCommissionEarned: row.minCommissionEarned,
          dividendRate: row.dividendRate,
          weeklySalary: row.weeklySalary,
          membersUnlockCount: row.membersUnlockCount,
          maxWithdrawalPercent: row.maxWithdrawalPercent,
          isActive: true,
        },
      });
    }
  }

  listLevels() {
    return this.prisma.vIPLevel.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async getLevelByNumber(level: number) {
    const row = await this.prisma.vIPLevel.findUnique({ where: { level } });
    if (row) return row;
    if (level === 0) {
      return {
        level: 0,
        levelName: 'Member',
        maxWithdrawalPercent: new Prisma.Decimal(20),
        dividendRate: new Prisma.Decimal(0),
        weeklySalary: new Prisma.Decimal(0),
        membersUnlockCount: 0,
        minInvestmentRequired: new Prisma.Decimal(0),
        minTeamMembers: 0,
        minCommissionEarned: new Prisma.Decimal(0),
      };
    }
    throw new NotFoundException('VIP level not found');
  }

  async ensureProgression(userId: string) {
    const existing = await this.prisma.vIPProgression.findUnique({ where: { userId } });
    if (existing) return existing;

    const next = await this.getLevelByNumber(1).catch(() => null);
    return this.prisma.vIPProgression.create({
      data: {
        userId,
        currentVipLevel: 0,
        investmentTarget: next?.minInvestmentRequired ?? new Prisma.Decimal(0),
        teamMembersTarget: next?.minTeamMembers ?? 0,
        commissionTarget: next?.minCommissionEarned ?? new Prisma.Decimal(0),
      },
    });
  }

  private async commissionTotal(userId: string): Promise<Prisma.Decimal> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return new Prisma.Decimal(0);

    const agg = await this.prisma.walletTransaction.aggregate({
      where: { walletId: wallet.id, type: WalletTxnType.COMMISSION },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? new Prisma.Decimal(0);
  }

  private async investmentTotal(userId: string): Promise<Prisma.Decimal> {
    const agg = await this.prisma.investment.aggregate({
      where: {
        userId,
        status: { in: [InvestmentStatus.ACTIVE, InvestmentStatus.MATURED] },
      },
      _sum: { principalAmount: true },
    });
    return agg._sum.principalAmount ?? new Prisma.Decimal(0);
  }

  private async teamTotal(userId: string): Promise<number> {
    const [l1, l2Ids, l3Ids] = await Promise.all([
      this.prisma.user.count({ where: { referredByUserId: userId } }),
      this.prisma.user
        .findMany({ where: { referredByUserId: userId }, select: { id: true } })
        .then((rows) =>
          rows.length
            ? this.prisma.user.count({ where: { referredByUserId: { in: rows.map((r) => r.id) } } })
            : 0,
        ),
      this.prisma.user
        .findMany({ where: { referredByUserId: userId }, select: { id: true } })
        .then(async (l1) => {
          if (!l1.length) return 0;
          const l2 = await this.prisma.user.findMany({
            where: { referredByUserId: { in: l1.map((r) => r.id) } },
            select: { id: true },
          });
          if (!l2.length) return 0;
          return this.prisma.user.count({
            where: { referredByUserId: { in: l2.map((r) => r.id) } },
          });
        }),
    ]);
    return l1 + l2Ids + l3Ids;
  }

  async recalculateUser(userId: string) {
    await this.ensureProgression(userId);

    const [investmentProgress, teamMembersProgress, commissionProgress, progression] =
      await Promise.all([
        this.investmentTotal(userId),
        this.teamTotal(userId),
        this.commissionTotal(userId),
        this.prisma.vIPProgression.findUnique({ where: { userId } }),
      ]);

    if (!progression) return;

    let currentLevel = progression.currentVipLevel;
    const completedAt = [...progression.levelsCompletedAt];
    let levelsCompleted = progression.levelsCompleted;
    let promoted = false;

    for (let attempt = 0; attempt < 9; attempt++) {
      const nextLevel = currentLevel + 1;
      if (nextLevel > 8) break;

      const def = await this.prisma.vIPLevel.findUnique({ where: { level: nextLevel, isActive: true } });
      if (!def) break;

      const meetsInvestment = investmentProgress.greaterThanOrEqualTo(def.minInvestmentRequired);
      const meetsTeam = teamMembersProgress >= def.minTeamMembers;
      const meetsCommission = commissionProgress.greaterThanOrEqualTo(def.minCommissionEarned);

      if (!meetsInvestment || !meetsTeam || !meetsCommission) break;

      currentLevel = nextLevel;
      levelsCompleted += 1;
      completedAt.push(new Date());
      promoted = true;

      await this.prisma.vIPBenefitEarned.create({
        data: {
          userId,
          vipLevel: nextLevel,
          benefitType: 'level_promotion',
          benefitAmount: def.weeklySalary,
          benefitPercentage: def.dividendRate,
          status: 'active',
          earnedFromDate: new Date(),
        },
      });
    }

    const nextDef =
      currentLevel < 8
        ? await this.prisma.vIPLevel.findUnique({ where: { level: currentLevel + 1, isActive: true } })
        : null;

    await this.prisma.$transaction([
      this.prisma.vIPProgression.update({
        where: { userId },
        data: {
          currentVipLevel: currentLevel,
          investmentProgress,
          teamMembersProgress,
          commissionProgress,
          investmentTarget: nextDef?.minInvestmentRequired ?? new Prisma.Decimal(0),
          teamMembersTarget: nextDef?.minTeamMembers ?? 0,
          commissionTarget: nextDef?.minCommissionEarned ?? new Prisma.Decimal(0),
          levelsCompleted,
          levelsCompletedAt: completedAt,
          eligibleForPromotionAt: promoted ? new Date() : progression.eligibleForPromotionAt,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { vipTier: currentLevel },
      }),
    ]);
  }

  async getStatus(userId: string) {
    await this.recalculateUser(userId);

    const [user, progression, currentLevel, nextLevel, benefits] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { vipTier: true },
      }),
      this.prisma.vIPProgression.findUnique({ where: { userId } }),
      this.prisma.user
        .findUnique({ where: { id: userId }, select: { vipTier: true } })
        .then((u) => this.getLevelByNumber(u?.vipTier ?? 0)),
      this.prisma.user
        .findUnique({ where: { id: userId }, select: { vipTier: true } })
        .then(async (u) => {
          const tier = u?.vipTier ?? 0;
          if (tier >= 8) return null;
          return this.prisma.vIPLevel.findUnique({ where: { level: tier + 1, isActive: true } });
        }),
      this.prisma.vIPBenefitEarned.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const vipPercent = currentLevel.maxWithdrawalPercent;

    return {
      currentLevel: {
        level: user?.vipTier ?? 0,
        name: currentLevel.levelName,
        description: 'levelDescription' in currentLevel ? currentLevel.levelDescription : null,
        dividendRate: currentLevel.dividendRate.toString(),
        weeklySalary: currentLevel.weeklySalary.toString(),
        membersUnlockCount: currentLevel.membersUnlockCount,
        maxWithdrawalPercent: vipPercent.toString(),
      },
      progression: progression
        ? {
            investmentProgress: progression.investmentProgress.toString(),
            investmentTarget: progression.investmentTarget.toString(),
            teamMembersProgress: progression.teamMembersProgress,
            teamMembersTarget: progression.teamMembersTarget,
            commissionProgress: progression.commissionProgress.toString(),
            commissionTarget: progression.commissionTarget.toString(),
            levelsCompleted: progression.levelsCompleted,
          }
        : null,
      nextLevel: nextLevel
        ? {
            level: nextLevel.level,
            name: nextLevel.levelName,
            requirements: {
              minInvestmentRequired: nextLevel.minInvestmentRequired.toString(),
              minTeamMembers: nextLevel.minTeamMembers,
              minCommissionEarned: nextLevel.minCommissionEarned.toString(),
            },
            benefits: {
              dividendRate: nextLevel.dividendRate.toString(),
              weeklySalary: nextLevel.weeklySalary.toString(),
              membersUnlockCount: nextLevel.membersUnlockCount,
              maxWithdrawalPercent: nextLevel.maxWithdrawalPercent.toString(),
            },
          }
        : null,
      recentBenefits: benefits.map((b) => ({
        id: b.id,
        vipLevel: b.vipLevel,
        benefitType: b.benefitType,
        benefitAmount: b.benefitAmount.toString(),
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  async getWithdrawalCapForUser(userId: string, vipTier: number) {
    const level = await this.getLevelByNumber(vipTier);
    return level.maxWithdrawalPercent;
  }

  adminUpdateLevel(
    level: number,
    data: Partial<{
      levelName: string;
      levelDescription: string | null;
      minInvestmentRequired: string;
      minTeamMembers: number;
      minCommissionEarned: string;
      dividendRate: string;
      weeklySalary: string;
      membersUnlockCount: number;
      maxWithdrawalPercent: string;
      isActive: boolean;
    }>,
  ) {
    const patch: Prisma.VIPLevelUpdateInput = {};
    if (data.levelName !== undefined) patch.levelName = data.levelName;
    if (data.levelDescription !== undefined) patch.levelDescription = data.levelDescription;
    if (data.minInvestmentRequired !== undefined) {
      patch.minInvestmentRequired = new Prisma.Decimal(data.minInvestmentRequired);
    }
    if (data.minTeamMembers !== undefined) patch.minTeamMembers = data.minTeamMembers;
    if (data.minCommissionEarned !== undefined) {
      patch.minCommissionEarned = new Prisma.Decimal(data.minCommissionEarned);
    }
    if (data.dividendRate !== undefined) patch.dividendRate = new Prisma.Decimal(data.dividendRate);
    if (data.weeklySalary !== undefined) patch.weeklySalary = new Prisma.Decimal(data.weeklySalary);
    if (data.membersUnlockCount !== undefined) patch.membersUnlockCount = data.membersUnlockCount;
    if (data.maxWithdrawalPercent !== undefined) {
      patch.maxWithdrawalPercent = new Prisma.Decimal(data.maxWithdrawalPercent);
    }
    if (data.isActive !== undefined) patch.isActive = data.isActive;

    return this.prisma.vIPLevel.update({ where: { level }, data: patch });
  }

  adminSetUserLevel(userId: string, level: number) {
    if (level < 0 || level > 8) throw new NotFoundException('Level must be 0–8');
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { vipTier: level } });
      const def = await tx.vIPLevel.findUnique({ where: { level } });
      const next = level < 8 ? await tx.vIPLevel.findUnique({ where: { level: level + 1 } }) : null;
      await tx.vIPProgression.upsert({
        where: { userId },
        create: {
          userId,
          currentVipLevel: level,
          investmentTarget: next?.minInvestmentRequired ?? new Prisma.Decimal(0),
          teamMembersTarget: next?.minTeamMembers ?? 0,
          commissionTarget: next?.minCommissionEarned ?? new Prisma.Decimal(0),
        },
        update: { currentVipLevel: level },
      });
      return tx.user.findUnique({
        where: { id: userId },
        select: { id: true, phoneNumber: true, vipTier: true },
      });
    });
  }
}
