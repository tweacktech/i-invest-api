import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PlatformService } from './platform.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly platform: PlatformService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const url = req.originalUrl ?? req.url ?? '';
    if (
      url.startsWith('/v1/public') ||
      url.startsWith('/v1/staff') ||
      url.startsWith('/v1/health')
    ) {
      return next();
    }

    const settings = await this.platform.getOrCreate();
    if (settings.maintenanceMode) {
      throw new ServiceUnavailableException(
        settings.maintenanceMessage || 'We are upgrading the platform. Please try again later.',
      );
    }
    next();
  }
}
