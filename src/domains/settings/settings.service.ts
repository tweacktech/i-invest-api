import { Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpsertBankDto } from './dto/upsert-bank.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        referralCode: true,
        vipTier: true,
        kycStatus: true,
        accountStatus: true,
        createdAt: true,
      },
    });
    const bankAccounts = await this.prisma.userBankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const security = await this.prisma.userSecuritySettings.findUnique({
      where: { userId },
      select: { withdrawalPinHash: true },
    });
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { available: true, frozen: true, reserved: true },
    });

    return {
      user,
      bankAccounts,
      hasWithdrawalPin: Boolean(security?.withdrawalPinHash),
      wallet,
    };
  }

  async upsertBank(userId: string, dto: UpsertBankDto) {
    if (dto.id) {
      const existing = await this.prisma.userBankAccount.findFirst({
        where: { id: dto.id, userId },
      });
      if (!existing) throw new NotFoundException('Bank account not found');

      return this.prisma.userBankAccount.update({
        where: { id: dto.id },
        data: {
          accountName: dto.accountName,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    }

    if (dto.isDefault) {
      await this.prisma.userBankAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.userBankAccount.create({
      data: {
        userId,
        accountName: dto.accountName,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async setWithdrawalPin(userId: string, pin: string) {
    const hashed = await hash(pin, 10);
    return this.prisma.userSecuritySettings.upsert({
      where: { userId },
      create: { userId, withdrawalPinHash: hashed },
      update: { withdrawalPinHash: hashed },
    });
  }
}
