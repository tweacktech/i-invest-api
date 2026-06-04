import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

const PLATFORM_ID = 'platform';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate() {
    const row = await this.prisma.platformSettings.findUnique({ where: { id: PLATFORM_ID } });
    if (row) return row;
    return this.prisma.platformSettings.create({
      data: {
        id: PLATFORM_ID,
        maintenanceMode: false,
        rechargeTimeoutMinutes: 30,
        welfareEnabled: false,
        welfareWeeklyPrice: new Prisma.Decimal(0),
        welfareHolidayDates: [],
        welcomeMessage: 'Welcome to I-Invest — grow your wealth with smart daily returns.',
        urgentAdminNote: null,
      },
    });
  }

  async update(patch: {
    maintenanceMode?: boolean;
    maintenanceMessage?: string | null;
    rechargeTimeoutMinutes?: number;
    welfareEnabled?: boolean;
    welfareWeeklyPrice?: string | number;
    welfareHolidayDates?: string[];
    welcomeMessage?: string | null;
    urgentAdminNote?: string | null;
    requireActiveInvestmentForWithdrawal?: boolean;
  }) {
    await this.getOrCreate();
    const data: Prisma.PlatformSettingsUpdateInput = {};
    if (patch.maintenanceMode !== undefined) data.maintenanceMode = patch.maintenanceMode;
    if (patch.maintenanceMessage !== undefined) data.maintenanceMessage = patch.maintenanceMessage;
    if (patch.rechargeTimeoutMinutes !== undefined) data.rechargeTimeoutMinutes = patch.rechargeTimeoutMinutes;
    if (patch.welfareEnabled !== undefined) data.welfareEnabled = patch.welfareEnabled;
    if (patch.welfareWeeklyPrice !== undefined) {
      data.welfareWeeklyPrice = new Prisma.Decimal(patch.welfareWeeklyPrice);
    }
    if (patch.welfareHolidayDates !== undefined) {
      data.welfareHolidayDates = patch.welfareHolidayDates;
    }
    if (patch.welcomeMessage !== undefined) data.welcomeMessage = patch.welcomeMessage;
    if (patch.urgentAdminNote !== undefined) data.urgentAdminNote = patch.urgentAdminNote;
    if (patch.requireActiveInvestmentForWithdrawal !== undefined) {
      data.requireActiveInvestmentForWithdrawal = patch.requireActiveInvestmentForWithdrawal;
    }
    return this.prisma.platformSettings.update({
      where: { id: PLATFORM_ID },
      data,
    });
  }
}
