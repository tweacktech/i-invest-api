import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PlatformService } from '../platform/platform.service';
import { dateKeyUTC, getWeekStartMonday, isHolidayUTC, isWeekendUTC } from './welfare-dates.util';

@Injectable()
export class WelfareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly platform: PlatformService,
  ) {}

  async getConfig() {
    const settings = await this.platform.getOrCreate();
    return {
      enabled: settings.welfareEnabled,
      weeklyPrice: settings.welfareWeeklyPrice.toString(),
      holidayDates: settings.welfareHolidayDates,
    };
  }

  async userStatus(userId: string) {
    const settings = await this.platform.getOrCreate();
    const now = new Date();
    const weekStart = getWeekStartMonday(now);
    const weekKey = dateKeyUTC(weekStart);

    let paidForCurrentWeek = false;
    let paidAt: string | null = null;

    if (settings.welfareEnabled) {
      const payment = await this.prisma.welfarePayment.findUnique({
        where: {
          userId_weekStart: { userId, weekStart },
        },
      });
      paidForCurrentWeek = Boolean(payment);
      paidAt = payment?.createdAt.toISOString() ?? null;
    }

    return {
      enabled: settings.welfareEnabled,
      weeklyPrice: settings.welfareWeeklyPrice.toString(),
      currentWeekStart: weekKey,
      paidForCurrentWeek,
      paidAt,
      isWeekend: isWeekendUTC(now),
      isHoliday: isHolidayUTC(now, settings.welfareHolidayDates),
      accrualPausedToday:
        settings.welfareEnabled &&
        (isWeekendUTC(now) || isHolidayUTC(now, settings.welfareHolidayDates)),
      message: this.statusMessage(settings.welfareEnabled, paidForCurrentWeek, now, settings.welfareHolidayDates),
    };
  }

  private statusMessage(
    enabled: boolean,
    paid: boolean,
    now: Date,
    holidays: string[],
  ): string | null {
    if (!enabled) return null;
    if (isWeekendUTC(now)) return 'Investment returns pause on weekends while welfare is active.';
    if (isHolidayUTC(now, holidays)) return 'Investment returns pause on public holidays.';
    if (!paid) return 'Pay weekly welfare (due each Monday) to keep your investments earning this week.';
    return 'Welfare paid for this week — your investments are active.';
  }

  async hasPaidForWeek(userId: string, weekStart: Date): Promise<boolean> {
    const settings = await this.platform.getOrCreate();
    if (!settings.welfareEnabled) return true;

    const row = await this.prisma.welfarePayment.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });
    return Boolean(row);
  }

  /** Whether interest can accrue for this user on `processingDate` (cron run day). */
  async canAccrueInvestment(userId: string, processingDate = new Date()): Promise<{ ok: boolean; reason?: string }> {
    const settings = await this.platform.getOrCreate();
    if (!settings.welfareEnabled) return { ok: true };

    if (isWeekendUTC(processingDate)) {
      return { ok: false, reason: 'weekend' };
    }
    if (isHolidayUTC(processingDate, settings.welfareHolidayDates)) {
      return { ok: false, reason: 'holiday' };
    }

    const weekStart = getWeekStartMonday(processingDate);
    const paid = await this.hasPaidForWeek(userId, weekStart);
    if (!paid) {
      return { ok: false, reason: 'welfare_unpaid' };
    }

    return { ok: true };
  }

  async purchase(userId: string) {
    const settings = await this.platform.getOrCreate();
    if (!settings.welfareEnabled) {
      throw new BadRequestException('Weekly welfare is not required right now');
    }

    const price = settings.welfareWeeklyPrice;
    if (price.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Welfare price is not configured. Contact support.');
    }

    const weekStart = getWeekStartMonday(new Date());
    const existing = await this.prisma.welfarePayment.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });
    if (existing) {
      throw new BadRequestException('You have already paid welfare for this week');
    }

    const wallet = await this.wallet.getWalletByUserId(userId);
    if (wallet.available.lessThan(price)) {
      throw new BadRequestException('Insufficient balance for welfare payment');
    }

    await this.wallet.applyBalanceChange(
      userId,
      WalletTxnType.WELFARE_FEE,
      { available: price.mul(-1) },
      {
        description: `Weekly welfare — week of ${dateKeyUTC(weekStart)}`,
        referenceType: 'welfare_payment',
        referenceId: dateKeyUTC(weekStart),
      },
    );

    return this.prisma.welfarePayment.create({
      data: {
        userId,
        weekStart,
        amount: price,
      },
    });
  }
}
