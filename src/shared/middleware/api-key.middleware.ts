import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const expected = this.config.get<string>('API_ACCESS_TOKEN');
    if (!expected?.trim()) {
      return next();
    }

    const url = req.originalUrl ?? req.url ?? '';
    if (url.startsWith('/v1/health') || url === '/v1' || url === '/v1/') {
      return next();
    }

    const headerKey = req.header('x-api-key');
    const auth = req.header('authorization');
    const bearerKey =
      auth?.startsWith('ApiKey ') ? auth.slice(7).trim() : auth?.startsWith('Bearer ') ? null : null;

    const provided = headerKey?.trim() || bearerKey;
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing API access token');
    }

    next();
  }
}
