import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export type StaffPrincipal = { adminId: string; email: string };

export const CurrentStaff = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StaffPrincipal => {
    const req = ctx.switchToHttp().getRequest<{ staff?: StaffPrincipal }>();
    const s = req.staff;
    if (!s) throw new UnauthorizedException();
    return s;
  },
);
