import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvestmentStatus, Prisma, WithdrawalStatus } from '@prisma/client';
import { WalletTxnType } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PlatformService } from '../platform/platform.service';
import { VipService } from '../vip/vip.service';

@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly platform: PlatformService,
    private readonly vip: VipService,
  ) {}

  async getLimits(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { vipTier: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const [walletRow, maxPercent, settings, activeInvestments] = await Promise.all([
      this.wallet.getWalletByUserId(userId),
      this.vip.getWithdrawalCapForUser(userId, user.vipTier),
      this.platform.getOrCreate(),
      this.prisma.investment.count({
        where: { userId, status: InvestmentStatus.ACTIVE },
      }),
    ]);

    const maxByVip = walletRow.available.mul(maxPercent).div(100);
    return {
      available: walletRow.available.toString(),
      maxWithdrawalPercent: maxPercent.toString(),
      maxWithdrawalAmount: maxByVip.toString(),
      vipTier: user.vipTier,
      requiresActiveInvestment: settings.requireActiveInvestmentForWithdrawal,
      hasActiveInvestment: activeInvestments > 0,
      canWithdraw:
        (!settings.requireActiveInvestmentForWithdrawal || activeInvestments > 0) &&
        maxByVip.greaterThan(0),
    };
  }

  async create(userId: string, bankAccountId: string, amountRaw: string, pin: string) {
    const amount = new Prisma.Decimal(amountRaw);
    if (amount.lessThanOrEqualTo(0)) throw new BadRequestException('Invalid amount');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { vipTier: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const settings = await this.platform.getOrCreate();
    if (settings.requireActiveInvestmentForWithdrawal) {
      const activeCount = await this.prisma.investment.count({
        where: { userId, status: InvestmentStatus.ACTIVE },
      });
      if (activeCount === 0) {
        throw new BadRequestException(
          'You need at least one active investment before you can withdraw',
        );
      }
    }

    const bank = await this.prisma.userBankAccount.findFirst({
      where: { id: bankAccountId, userId },
    });
    if (!bank) throw new NotFoundException('Bank account not found');

    const security = await this.prisma.userSecuritySettings.findUnique({
      where: { userId },
    });
    if (!security?.withdrawalPinHash) {
      throw new BadRequestException('Set a withdrawal PIN in settings first');
    }

    const pinOk = await compare(pin, security.withdrawalPinHash);
    if (!pinOk) throw new ForbiddenException('Invalid withdrawal PIN');

    const walletRow = await this.wallet.getWalletByUserId(userId);
    if (walletRow.available.lessThan(amount)) {
      throw new BadRequestException('Insufficient available balance');
    }

    const maxPercent = await this.vip.getWithdrawalCapForUser(userId, user.vipTier);
    const maxAllowed = walletRow.available.mul(maxPercent).div(100);
    if (amount.greaterThan(maxAllowed)) {
      throw new BadRequestException(
        `Maximum withdrawal for VIP ${user.vipTier} is ${maxPercent.toString()}% of available balance (${maxAllowed.toString()} NGN)`,
      );
    }

    await this.wallet.applyBalanceChange(
      userId,
      WalletTxnType.RESERVE_FOR_WITHDRAWAL,
      {
        available: amount.mul(-1),
        reserved: amount,
      },
      {
        description: 'Withdrawal requested — funds reserved',
        referenceType: 'bank_account',
        referenceId: bankAccountId,
      },
    );

    return this.prisma.withdrawalRequest.create({
      data: {
        userId,
        bankAccountId,
        amount,
        status: WithdrawalStatus.PENDING,
      },
      include: { bankAccount: true },
    });
  }

  listMine(userId: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: { userId },
      include: { bankAccount: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listPendingAdmin() {
    return this.prisma.withdrawalRequest.findMany({
      where: { status: WithdrawalStatus.PENDING },
      include: {
        user: { select: { phoneNumber: true, id: true, vipTier: true } },
        bankAccount: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  listAllAdmin(status?: WithdrawalStatus, take = 100) {
    return this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { phoneNumber: true, id: true, vipTier: true, displayName: true } },
        bankAccount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 500),
    });
  }

  async approveAdmin(id: string) {
    const w = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { bankAccount: true },
    });
    if (!w || w.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Invalid withdrawal');
    }

    await this.wallet.applyBalanceChange(
      w.userId,
      WalletTxnType.WITHDRAWAL,
      { reserved: w.amount.negated() },
      {
        description: 'Withdrawal paid',
        referenceType: 'withdrawal_request',
        referenceId: w.id,
      },
    );

    return this.prisma.withdrawalRequest.update({
      where: { id },
      data: { status: WithdrawalStatus.COMPLETED },
      include: { bankAccount: true },
    });
  }

  async rejectAdmin(id: string, note?: string) {
    const w = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!w || w.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Invalid withdrawal');
    }

    await this.wallet.applyBalanceChange(
      w.userId,
      WalletTxnType.RELEASE_WITHDRAWAL_RESERVE,
      {
        reserved: w.amount.mul(-1),
        available: w.amount,
      },
      {
        description: note ?? 'Withdrawal rejected — funds released',
        referenceType: 'withdrawal_request',
        referenceId: w.id,
      },
    );

    return this.prisma.withdrawalRequest.update({
      where: { id },
      data: { status: WithdrawalStatus.REJECTED, adminNote: note },
    });
  }
}
