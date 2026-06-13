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

type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
    phoneNumber: string;
  };
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        message: 'Session expired',
        redirectTo: '/login',
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    let payload: {
      sub: string;
      phoneNumber: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException({
        message: 'Please log in again.',
        redirectTo: '/login',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        accountStatus: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'Account not found.',
        redirectTo: '/login',
      });
    }

    if (user.accountStatus === AccountStatus.BANNED) {
      throw new ForbiddenException('Your account has been banned.');
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Your account has been suspended.',
      );
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!wallet) {
      await this.prisma.wallet.create({
        data: {
          userId: user.id,
        },
      });
    }

    request.user = payload;

    return true;
  }
}