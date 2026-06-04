import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RechargeChannel, RechargeStatus } from '@prisma/client';
import { WalletTxnType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PlatformService } from '../platform/platform.service';

const MIN_RECHARGE = new Prisma.Decimal(3000);
const MAX_RECHARGE = new Prisma.Decimal(2_000_000);

@Injectable()
export class RechargeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly platform: PlatformService,
  ) {}

  async create(userId: string, amountRaw: string, channel: RechargeChannel, depositMethodId?: string) {
    await this.ensureUserReady(userId);

    const amount = new Prisma.Decimal(amountRaw);
    if (amount.lessThan(MIN_RECHARGE) || amount.greaterThan(MAX_RECHARGE)) {
      throw new BadRequestException(`Amount must be between ${MIN_RECHARGE} and ${MAX_RECHARGE}`);
    }

    if (channel === RechargeChannel.MANUAL) {
      if (!depositMethodId) {
        throw new BadRequestException('Select a transfer account (A–D) for bank transfer');
      }
      const method = await this.prisma.depositMethod.findFirst({
        where: { id: depositMethodId, isEnabled: true },
      });
      if (!method) throw new BadRequestException('Invalid or disabled transfer account');

      const settings = await this.platform.getOrCreate();
      const minutes = settings.rechargeTimeoutMinutes ?? 30;
      const expiresAt = new Date(Date.now() + minutes * 60_000);
      const transferNarration = await this.generateUniqueNarration();

      return this.prisma.rechargeRequest.create({
        data: {
          userId,
          amount,
          channel: RechargeChannel.MANUAL,
          status: RechargeStatus.PENDING,
          note: `Pay ${amount.toString()} to ${method.label}. Use narration: ${transferNarration}`,
          depositMethodId: method.id,
          transferNarration,
          expiresAt,
        },
        include: { depositMethod: true },
      });
    }

    const req = await this.prisma.rechargeRequest.create({
      data: {
        userId,
        amount,
        channel,
        status: RechargeStatus.COMPLETED,
        note: 'Gateway simulated instant credit',
      },
    });

    await this.wallet.applyBalanceChange(
      userId,
      WalletTxnType.DEPOSIT,
      { available: amount },
      {
        description: `Recharge via ${channel}`,
        referenceType: 'recharge_request',
        referenceId: req.id,
      },
    );

    return req;
  }

  listMine(userId: string) {
    return this.prisma.rechargeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { depositMethod: true },
    });
  }

  /**
   * Fetch a single recharge request, scoped to the owning user.
   * Used by the confirm page to poll live status.
   */
  async findOne(userId: string, requestId: string) {
    const req = await this.prisma.rechargeRequest.findUnique({
      where: { id: requestId },
      include: { depositMethod: true },
    });

    if (!req || req.userId !== userId) {
      throw new NotFoundException('Recharge request not found');
    }

    return req;
  }

  /**
   * User signals they have made the transfer.
   * Flags the request with a `userNotifiedAt` timestamp so staff can
   * prioritise review. Does NOT credit the wallet.
   */
  async notifyPaid(userId: string, requestId: string) {
    const req = await this.prisma.rechargeRequest.findUnique({
      where: { id: requestId },
    });

    if (!req || req.userId !== userId) {
      throw new NotFoundException('Recharge request not found');
    }

    if (req.status !== RechargeStatus.PENDING) {
      throw new BadRequestException(
        req.status === RechargeStatus.COMPLETED
          ? 'This recharge has already been approved.'
          : 'This recharge is no longer pending.',
      );
    }

    if (req.expiresAt && req.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This recharge order has expired.');
    }

    return this.prisma.rechargeRequest.update({
      where: { id: requestId },
      data: {
        note: `User notified payment made at ${new Date().toISOString()}. ${req.note ?? ''}`.trim(),
      },
      include: { depositMethod: true },
    });
  }

  listPendingAdmin() {
    return this.prisma.rechargeRequest.findMany({
      where: {
        status: RechargeStatus.PENDING,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        user: { select: { phoneNumber: true, id: true, displayName: true, vipTier: true } },
        depositMethod: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  listAllAdmin(status?: RechargeStatus, take = 100) {
    return this.prisma.rechargeRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { phoneNumber: true, id: true, displayName: true, vipTier: true } },
        depositMethod: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 500),
    });
  }

  async approveAdmin(requestId: string) {
    const req = await this.prisma.rechargeRequest.findUnique({ where: { id: requestId } });
    if (!req || req.status !== RechargeStatus.PENDING) {
      throw new BadRequestException('Invalid recharge request');
    }
    if (req.expiresAt && req.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This recharge order has expired');
    }

    await this.prisma.rechargeRequest.update({
      where: { id: requestId },
      data: { status: RechargeStatus.COMPLETED },
    });

    await this.wallet.applyBalanceChange(
      req.userId,
      WalletTxnType.DEPOSIT,
      { available: req.amount },
      {
        description: 'Manual recharge approved',
        referenceType: 'recharge_request',
        referenceId: req.id,
      },
    );

    return this.prisma.rechargeRequest.findUnique({
      where: { id: requestId },
      include: { depositMethod: true },
    });
  }

  async rejectAdmin(requestId: string) {
    return this.prisma.rechargeRequest.update({
      where: { id: requestId },
      data: { status: RechargeStatus.REJECTED },
    });
  }

  async expireStalePending(): Promise<number> {
    const now = new Date();
    const res = await this.prisma.rechargeRequest.updateMany({
      where: {
        status: RechargeStatus.PENDING,
        channel: RechargeChannel.MANUAL,
        expiresAt: { lte: now },
      },
      data: {
        status: RechargeStatus.EXPIRED,
        note: 'Expired — payment not received in time',
      },
    });
    return res.count;
  }

  private async ensureUserReady(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException('User account not found. Please log out and sign in again.');
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      await this.prisma.wallet.create({ data: { userId } });
    }
  }

  private async generateUniqueNarration(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = `IINV-${randomBytes(5).toString('hex').toUpperCase()}`;
      const clash = await this.prisma.rechargeRequest.findUnique({
        where: { transferNarration: code },
        select: { id: true },
      });
      if (!clash) return code;
    }
    throw new BadRequestException('Could not allocate a unique transfer narration');
  }
}