import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { available: true, frozen: true, reserved: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Records a ledger row with full balance snapshots */
  async appendLedger(
    walletId: string,
    type: WalletTxnType,
    amount: Prisma.Decimal,
    opts: {
      description?: string;
      referenceType?: string;
      referenceId?: string;
    } = {},
  ) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.walletTransaction.create({
      data: {
        walletId,
        type,
        amount,
        balanceBefore: wallet.available,
        balanceAfter: wallet.available,
        frozenBefore: wallet.frozen,
        frozenAfter: wallet.frozen,
        reservedBefore: wallet.reserved,
        reservedAfter: wallet.reserved,
        description: opts.description,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
      },
    });
  }

  // async applyBalanceChange(
  //   userId: string,
  //   type: WalletTxnType,
  //   delta: {
  //     available?: Prisma.Decimal | number | string;
  //     frozen?: Prisma.Decimal | number | string;
  //     reserved?: Prisma.Decimal | number | string;
  //     doneAmount?: Prisma.Decimal | number | string;
  //   },
  //   opts: { description?: string; referenceType?: string; referenceId?: string } = {},
  // ) {
  //   const toDec = (v: Prisma.Decimal | number | string | undefined) =>
  //     v === undefined ? new Prisma.Decimal(0) : new Prisma.Decimal(v);

  //   return this.prisma.$transaction(async (tx) => {
  //     const wallet = await tx.wallet.findUnique({ where: { userId } });
  //     if (!wallet) throw new NotFoundException('Wallet not found');

  //     const dA = toDec(delta.available);
  //     const dF = toDec(delta.frozen);
  //     const dR = toDec(delta.reserved);

  //     const nextAvailable = wallet.available.plus(dA);
  //     const nextFrozen = wallet.frozen.plus(dF);
  //     const nextReserved = wallet.reserved.plus(dR);

  //     if (nextAvailable.lessThan(0) || nextFrozen.lessThan(0) || nextReserved.lessThan(0)) {
  //       throw new BadRequestException('Insufficient balance');
  //     }

  //     const magnitude = dA.abs().plus(dF.abs()).plus(dR.abs());
  //     await tx.wallet.update({
  //       where: { id: wallet.id },
  //       data: {
  //         available: nextAvailable,
  //         frozen: nextFrozen,
  //         reserved: nextReserved,
  //       },
  //     });

  //     const row = await tx.walletTransaction.create({
  //       data: {
  //         walletId: wallet.id,
  //         type,
  //         amount: magnitude,
  //         balanceBefore: wallet.available,
  //         balanceAfter: nextAvailable,
  //         frozenBefore: wallet.frozen,
  //         frozenAfter: nextFrozen,
  //         reservedBefore: wallet.reserved,
  //         reservedAfter: nextReserved,
  //         description: opts.description,
  //         referenceType: opts.referenceType,
  //         referenceId: opts.referenceId,
  //       },
  //     });

  //     return row;
  //   });
  // }

  async applyBalanceChange(
    userId: string,
    type: WalletTxnType,
    delta: {
      available?: Prisma.Decimal | number | string;
      frozen?: Prisma.Decimal | number | string;
      reserved?: Prisma.Decimal | number | string;
      doneAmount?: Prisma.Decimal | number | string;
    },
    opts: {
      description?: string;
      referenceType?: string;
      referenceId?: string;
    } = {},
  ) {
    const toDec = (v: Prisma.Decimal | number | string | undefined) =>
      v === undefined ? new Prisma.Decimal(0) : new Prisma.Decimal(v);
  
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
  
      const dA = toDec(delta.available);
      const dF = toDec(delta.frozen);
      const dR = toDec(delta.reserved);
      const dD = toDec(delta.doneAmount);
  
      const nextAvailable = wallet.available.plus(dA);
      const nextFrozen = wallet.frozen.plus(dF);
      const nextReserved = wallet.reserved.plus(dR);
  
      // IMPORTANT: doneAmount is accumulation only (never negative)
      const nextDoneAmount = (wallet as any).doneAmount
        ? (wallet as any).doneAmount.plus(dD)
        : dD;
  
      if (
        nextAvailable.lessThan(0) ||
        nextFrozen.lessThan(0) ||
        nextReserved.lessThan(0)
      ) {
        throw new BadRequestException('Insufficient balance');
      }
  
      const magnitude = dA.abs().plus(dF.abs()).plus(dR.abs()).plus(dD.abs());
  
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          available: nextAvailable,
          frozen: nextFrozen,
          reserved: nextReserved,
          ...( (wallet as any).doneAmount !== undefined
            ? { doneAmount: nextDoneAmount }
            : {} ),
        },
      });
  
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: magnitude,
          balanceBefore: wallet.available,
          balanceAfter: nextAvailable,
          frozenBefore: wallet.frozen,
          frozenAfter: nextFrozen,
          reservedBefore: wallet.reserved,
          reservedAfter: nextReserved,
          description: opts.description,
          referenceType: opts.referenceType,
          referenceId: opts.referenceId,
        },
      });
    });
  }

  /** @deprecated — prefer applyBalanceChange */
  async addTransaction(
    walletId: string,
    type: WalletTxnType,
    amount: Prisma.Decimal,
    description?: string,
  ) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const before = wallet.available;
    const after = before.plus(amount);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { id: walletId }, data: { available: after } });
      return tx.walletTransaction.create({
        data: {
          walletId,
          type,
          amount,
          balanceBefore: before,
          balanceAfter: after,
          frozenBefore: wallet.frozen,
          frozenAfter: wallet.frozen,
          reservedBefore: wallet.reserved,
          reservedAfter: wallet.reserved,
          description,
        },
      });
    });
  }
}
