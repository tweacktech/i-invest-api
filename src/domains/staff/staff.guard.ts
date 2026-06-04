import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { STAFF_JWT } from './staff-jwt.constants';
import type { StaffPrincipal } from './current-staff.decorator';

type JwtPayload = { sub: string; role?: string };

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    @Inject(STAFF_JWT) private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { staff?: StaffPrincipal }>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required | logout and login again');
    }
    const token = authHeader.replace('Bearer ', '').trim();
    let payload: JwtPayload;
    try {
      payload = (await this.jwt.verifyAsync(token)) as JwtPayload;
    } catch {
      throw new UnauthorizedException('UnAuthorized User| you need to login');
      // throw new UnauthorizedException('Invalid token');
    }
    if (payload.role !== 'staff' || !payload.sub) {
      throw new ForbiddenException('Staff access required');
    }
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    });
    if (!admin?.isActive) throw new ForbiddenException('Staff account inactive');
    request.staff = { adminId: admin.id, email: admin.email };
    return true;
  }
}
