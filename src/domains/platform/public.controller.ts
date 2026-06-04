import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PlatformService } from './platform.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platform: PlatformService,
  ) {}

  @Get('site')
  async site() {
    const s = await this.platform.getOrCreate();
    return {
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      rechargeTimeoutMinutes: s.rechargeTimeoutMinutes,
      welcomeMessage: s.welcomeMessage,
      urgentAdminNote: s.urgentAdminNote,
    };
  }

  @Get('deposit-methods')
  depositMethods() {
    return this.prisma.depositMethod.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        label: true,
        bankName: true,
        accountName: true,
        accountNumber: true,
      },
    });
  }

  @Get('catalog-banks')
  catalogBanks() {
    return this.prisma.catalogBank.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, bankCode: true },
    });
  }
}
