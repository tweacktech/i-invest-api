import { Injectable } from '@nestjs/common';
import { Prisma, RechargeStatus, WithdrawalStatus, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class StaffStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);

    const [
      userCount,
      newUsersToday,
      newUsersWeek,
      rechargeGroups,
      withdrawalGroups,
      investmentAgg,
      pendingRecharges,
      pendingWithdrawals,
      commissionAgg,
      activeInvestments,
      completedRechargesToday,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.rechargeRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.investment.aggregate({
        _count: { _all: true },
        _sum: { principalAmount: true },
      }),
      this.prisma.rechargeRequest.count({ where: { status: RechargeStatus.PENDING } }),
      this.prisma.withdrawalRequest.count({ where: { status: WithdrawalStatus.PENDING } }),
      this.prisma.walletTransaction.aggregate({
        where: { type: WalletTxnType.COMMISSION },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.investment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.rechargeRequest.count({
        where: { status: RechargeStatus.COMPLETED, updatedAt: { gte: startOfDay } },
      }),
    ]);

    const mapGroups = (
      groups: { status: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }[],
    ) => {
      const out: Record<string, { count: number; amount: string }> = {};
      for (const g of groups) {
        out[g.status] = {
          count: g._count._all,
          amount: (g._sum.amount ?? new Prisma.Decimal(0)).toString(),
        };
      }
      return out;
    };

    return {
      users: {
        total: userCount,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
      },
      recharges: {
        byStatus: mapGroups(rechargeGroups),
        pending: pendingRecharges,
        completedToday: completedRechargesToday,
      },
      withdrawals: {
        byStatus: mapGroups(withdrawalGroups),
        pending: pendingWithdrawals,
      },
      investments: {
        totalCount: investmentAgg._count._all,
        totalPrincipal: (investmentAgg._sum.principalAmount ?? new Prisma.Decimal(0)).toString(),
        activeCount: activeInvestments,
      },
      commissions: {
        totalPaid: (commissionAgg._sum.amount ?? new Prisma.Decimal(0)).toString(),
        transactionCount: commissionAgg._count._all,
      },
      generatedAt: now.toISOString(),
    };
  }
}
