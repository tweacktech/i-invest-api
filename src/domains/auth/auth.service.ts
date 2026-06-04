import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { VipService } from '../vip/vip.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly vip: VipService,
  ) {}

  async registerUser(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
    if (existing) throw new ConflictException('Phone number is already registered');

    const referredBy = dto.referralCode
      ? await this.prisma.user.findUnique({ where: { referralCode: dto.referralCode } })
      : null;
    if (dto.referralCode && !referredBy) throw new UnauthorizedException('Invalid referral code');

    const passwordHash = await hash(dto.password, 10);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phoneNumber: dto.phoneNumber,
          passwordHash,
          referralCode: randomUUID().slice(0, 8).toUpperCase(),
          referredByUserId: referredBy?.id,
        },
      });

      await tx.wallet.create({ data: { userId: user.id } });
      return user;
    });

    await this.vip.ensureProgression(created.id);
    if (referredBy?.id) {
      await this.vip.recalculateUser(referredBy.id);
    }

    return this.buildAuthResponse(created);
  }

  async loginUser(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const matches = await compare(dto.password, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Invalid credentials');

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended. Contact support.');
    }
    if (user.accountStatus === AccountStatus.BANNED) {
      throw new ForbiddenException('Your account has been banned.');
    }

    return this.buildAuthResponse(user);
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
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
  }

  private async buildAuthResponse(user: User) {
    const payload = { sub: user.id, phoneNumber: user.phoneNumber };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    const parsed = this.jwtService.decode(refreshToken) as Prisma.JsonObject | null;
    const exp = typeof parsed?.exp === 'number' ? parsed.exp : Math.floor(Date.now() / 1000) + 604800;

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(exp * 1000),
      },
    });

    return { userId: user.id, accessToken, refreshToken };
  }
}
