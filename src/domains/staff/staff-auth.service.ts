import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { STAFF_JWT } from './staff-jwt.constants';

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STAFF_JWT) private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const admin = await this.prisma.admin.findUnique({ where: { email: normalized } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await compare(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, role: 'staff' },
      { expiresIn: '12h' },
    );

    return {
      accessToken,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  async me(adminId: string) {
    return this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    });
  }
}
