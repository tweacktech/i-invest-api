import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

type AuthenticatedRequest = Request & { user?: { sub: string; phoneNumber: string } };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): { sub: string; phoneNumber: string } | undefined => {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user;
  },
);
