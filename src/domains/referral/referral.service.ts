import { Injectable } from '@nestjs/common';
import { Prisma, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { VipService } from '../vip/vip.service';

const COMMISSION_TIERS = [
  { level: 1, percent: 20 },
  { level: 2, percent: 3 },
  { level: 3, percent: 2 },
] as const;

function maskPhone(phone: string): string {
  if (phone.length <= 7) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly vip: VipService,
  ) {}

  async distributeOnInvestment(investorUserId: string, investmentId: string, principal: Prisma.Decimal) {
    const investor = await this.prisma.user.findUnique({
      where: { id: investorUserId },
      select: { phoneNumber: true, referredByUserId: true },
    });
    if (!investor?.referredByUserId) return;

    let referrerId: string | null = investor.referredByUserId;
    const touched = new Set<string>([investorUserId]);
    for (const tier of COMMISSION_TIERS) {
      if (!referrerId) break;

      const amount = principal.mul(tier.percent).div(100);
      if (amount.greaterThan(0)) {
        await this.wallet.applyBalanceChange(referrerId, WalletTxnType.COMMISSION, { available: amount }, {
          description: `Level ${tier.level} referral — ${maskPhone(investor.phoneNumber)}`,
          referenceType: 'referral_commission',
          referenceId: investmentId,
        });
        touched.add(referrerId);
      }

      const up = await this.prisma.user.findUnique({
        where: { id: referrerId },
        select: { referredByUserId: true },
      });
      referrerId = up?.referredByUserId ?? null;
    }

    for (const uid of touched) {
      await this.vip.recalculateUser(uid);
    }
  }

  async getSummary(userId: string) {
    const [level1, level2Ids, level3Ids, commissionAgg] = await Promise.all([
      this.prisma.user.findMany({
        where: { referredByUserId: userId },
        select: { id: true },
      }),
      this.getLevel2Ids(userId),
      this.getLevel3Ids(userId),
      this.commissionTotals(userId),
    ]);

    return {
      teamCounts: {
        level1: level1.length,
        level2: level2Ids.length,
        level3: level3Ids.length,
        total: level1.length + level2Ids.length + level3Ids.length,
      },
      commissionRates: COMMISSION_TIERS.map((t) => ({ level: t.level, percent: t.percent })),
      commissions: commissionAgg,
    };
  }

  private async getLevel2Ids(userId: string) {
    const l1 = await this.prisma.user.findMany({
      where: { referredByUserId: userId },
      select: { id: true },
    });
    if (!l1.length) return [];
    return this.prisma.user.findMany({
      where: { referredByUserId: { in: l1.map((u) => u.id) } },
      select: { id: true },
    });
  }

  private async getLevel3Ids(userId: string) {
    const l2 = await this.getLevel2Ids(userId);
    if (!l2.length) return [];
    return this.prisma.user.findMany({
      where: { referredByUserId: { in: l2.map((u) => u.id) } },
      select: { id: true },
    });
  }

  private async commissionTotals(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return { total: '0', level1: '0', level2: '0', level3: '0', count: 0 };
    }

    const rows = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, type: WalletTxnType.COMMISSION },
      select: { amount: true, description: true },
    });

    let total = new Prisma.Decimal(0);
    let level1 = new Prisma.Decimal(0);
    let level2 = new Prisma.Decimal(0);
    let level3 = new Prisma.Decimal(0);

    for (const r of rows) {
      total = total.plus(r.amount);
      const desc = r.description ?? '';
      if (desc.includes('Level 1')) level1 = level1.plus(r.amount);
      else if (desc.includes('Level 2')) level2 = level2.plus(r.amount);
      else if (desc.includes('Level 3')) level3 = level3.plus(r.amount);
    }

    return {
      total: total.toString(),
      level1: level1.toString(),
      level2: level2.toString(),
      level3: level3.toString(),
      count: rows.length,
    };
  }

  async getTeam(userId: string) {
    const level1 = await this.prisma.user.findMany({
      where: { referredByUserId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phoneNumber: true,
        referralCode: true,
        vipTier: true,
        createdAt: true,
        _count: { select: { investments: true, referrals: true } },
      },
    });

    const level1Ids = level1.map((u) => u.id);
    const level2 = level1Ids.length
      ? await this.prisma.user.findMany({
          where: { referredByUserId: { in: level1Ids } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            phoneNumber: true,
            referralCode: true,
            vipTier: true,
            createdAt: true,
            referredByUserId: true,
            _count: { select: { investments: true } },
          },
        })
      : [];

    const level2Ids = level2.map((u) => u.id);
    const level3 = level2Ids.length
      ? await this.prisma.user.findMany({
          where: { referredByUserId: { in: level2Ids } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            phoneNumber: true,
            referralCode: true,
            vipTier: true,
            createdAt: true,
            referredByUserId: true,
            _count: { select: { investments: true } },
          },
        })
      : [];

    const mapMember = (u: {
      id: string;
      phoneNumber: string;
      referralCode: string;
      vipTier: number;
      createdAt: Date;
      referredByUserId?: string | null;
      _count: { investments: number; referrals?: number };
    }, level: number) => ({
      id: u.id,
      phoneMasked: maskPhone(u.phoneNumber),
      referralCode: u.referralCode,
      vipTier: u.vipTier,
      level,
      joinedAt: u.createdAt.toISOString(),
      investmentCount: u._count.investments,
      directReferrals: u._count.referrals ?? 0,
      referredByUserId: u.referredByUserId,
    });

    return {
      levels: [
        { level: 1, ratePercent: 20, members: level1.map((u) => mapMember(u, 1)) },
        { level: 2, ratePercent: 3, members: level2.map((u) => mapMember(u, 2)) },
        { level: 3, ratePercent: 2, members: level3.map((u) => mapMember(u, 3)) },
      ],
    };
  }

  async getCommissions(userId: string, take = 50) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return [];

    const rows = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, type: WalletTxnType.COMMISSION },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return rows.map((r) => {
      let level = 0;
      const desc = r.description ?? '';
      if (desc.includes('Level 1')) level = 1;
      else if (desc.includes('Level 2')) level = 2;
      else if (desc.includes('Level 3')) level = 3;

      return {
        id: r.id,
        amount: r.amount.toString(),
        level,
        description: r.description,
        referenceId: r.referenceId,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }
}
