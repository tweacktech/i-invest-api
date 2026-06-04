import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../shared/prisma/prisma.service';

type AuthenticatedRequest = Request & { user?: { sub: string; phoneNumber: string } };

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required | logout and login again');
    // if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

    const token = authHeader.replace('Bearer ', '').trim();
    let payload: { sub: string; phoneNumber: string };
    try {
      payload = (await this.jwtService.verifyAsync(token)) as {
        sub: string;
        phoneNumber: string;
      };
    } catch {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, accountStatus: true },
    });
    if (!user) {
      throw new UnauthorizedException('Account not found. Please log out and sign in again.');
    }
    if (user.accountStatus === AccountStatus.BANNED) {
      throw new ForbiddenException('Your account has been banned.');
    }
    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended.');
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      await this.prisma.wallet.create({ data: { userId: user.id } });
    }

    request.user = payload;
    return true;
  }
}
