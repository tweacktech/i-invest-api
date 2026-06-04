import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, KycStatus, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { VipService } from '../vip/vip.service';
import { StaffUpdateUserDto } from './dto/staff-update-user.dto';

export type StaffUserListFilters = {
  search?: string;
  status?: AccountStatus;
  kyc?: KycStatus;
};

@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vip: VipService,
  ) {}

  list(filters: StaffUserListFilters) {
    const where: Prisma.UserWhereInput = {};
    if (filters.status) where.accountStatus = filters.status;
    if (filters.kyc) where.kycStatus = filters.kyc;
    const q = filters.search?.trim();
    if (q) {
      where.OR = [
        { phoneNumber: { contains: q } },
        { referralCode: { contains: q, mode: 'insensitive' } },
        { id: q },
      ];
    }

    return this.prisma.user.findMany({
      where,
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        referralCode: true,
        vipTier: true,
        kycStatus: true,
        accountStatus: true,
        createdAt: true,
        wallet: { select: { available: true, frozen: true, reserved: true } },
        _count: { select: { investments: true, rechargeRequests: true, withdrawals: true } },
      },
    });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        referralCode: true,
        vipTier: true,
        kycStatus: true,
        accountStatus: true,
        createdAt: true,
        referredByUser: { select: { id: true, phoneNumber: true, referralCode: true } },
        wallet: { select: { available: true, frozen: true, reserved: true } },
        bankAccounts: {
          select: { id: true, bankName: true, accountName: true, accountNumber: true, isDefault: true },
          orderBy: { createdAt: 'desc' },
        },
        securitySettings: { select: { id: true, withdrawalPinHash: true } },
        vipProgression: true,
        _count: { select: { investments: true, referrals: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { securitySettings, ...rest } = user;
    return {
      ...rest,
      hasWithdrawalPin: Boolean(securitySettings?.withdrawalPinHash),
    };
  }

  private async updateUser(id: string, data: Prisma.UserUpdateInput) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          phoneNumber: true,
          kycStatus: true,
          accountStatus: true,
        },
      });
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  verifyKyc(id: string) {
    return this.updateUser(id, { kycStatus: KycStatus.VERIFIED });
  }

  rejectKyc(id: string) {
    return this.updateUser(id, { kycStatus: KycStatus.REJECTED });
  }

  suspend(id: string) {
    return this.updateUser(id, { accountStatus: AccountStatus.SUSPENDED });
  }

  ban(id: string) {
    return this.updateUser(id, { accountStatus: AccountStatus.BANNED });
  }

  activate(id: string) {
    return this.updateUser(id, { accountStatus: AccountStatus.ACTIVE });
  }

  async updateProfile(id: string, dto: StaffUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: Prisma.UserUpdateInput = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim();
    if (dto.phoneNumber !== undefined) {
      const taken = await this.prisma.user.findFirst({
        where: { phoneNumber: dto.phoneNumber, NOT: { id } },
      });
      if (taken) throw new ConflictException('Phone number already in use');
      data.phoneNumber = dto.phoneNumber;
    }
    if (dto.password) data.passwordHash = await hash(dto.password, 10);

    if (dto.withdrawalPin) {
      const pinHash = await hash(dto.withdrawalPin, 10);
      await this.prisma.userSecuritySettings.upsert({
        where: { userId: id },
        create: { userId: id, withdrawalPinHash: pinHash },
        update: { withdrawalPinHash: pinHash },
      });
    }

    if (dto.vipTier !== undefined) {
      await this.vip.adminSetUserLevel(id, dto.vipTier);
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { id }, data });
    }

    return this.getById(id);
  }
}
