import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentStatus, Prisma, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralService } from '../referral/referral.service';
import { WelfareService } from '../welfare/welfare.service';
import { isHolidayUTC, isWeekendUTC } from '../welfare/welfare-dates.util';

@Injectable()
export class InvestmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly referral: ReferralService,
    private readonly welfare: WelfareService,
  ) {}

  listPackages() {
    return this.prisma.investmentPackage.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async listMine(userId: string) {
    return this.prisma.investment.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async purchase(userId: string, packageId: string, amountRaw?: string) {
    console.log('started purchest');
    const pkg = await this.prisma.investmentPackage.findFirst({
      where: { id: packageId, isActive: true },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    let principal = new Prisma.Decimal(pkg.price);
    if (amountRaw !== undefined && amountRaw !== '') {
      principal = new Prisma.Decimal(amountRaw);
    }

    if (principal.lessThan(pkg.minAmount) || principal.greaterThan(pkg.maxAmount)) {
      throw new BadRequestException(
        `Amount must be between ${pkg.minAmount.toString()} and ${pkg.maxAmount.toString()}`,
      );
    }

    const walletRow = await this.wallet.getWalletByUserId(userId);
    if (walletRow.available.lessThan(principal)) {
      throw new BadRequestException('Insufficient available balance');
    }

    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + pkg.maturityDays);

    await this.wallet.applyBalanceChange(
      userId,
      WalletTxnType.INVESTMENT_PURCHASE,
      {
        available: principal.mul(-1),
        frozen: principal,
      },
      {
        description: `Investment in ${pkg.name}`,
        referenceType: 'investment_package',
        referenceId: pkg.id,
      },
    );

    const investment = await this.prisma.investment.create({
      data: {
        userId,
        packageId: pkg.id,
        principalAmount: principal,
        dailyYieldPercent: pkg.dailyYieldPercent,
        status: InvestmentStatus.ACTIVE,
        maturityDate,
        nextInterestDate: this.nextInterestDueFrom(new Date()),
      },
      include: { package: true },
    });

    await this.referral.distributeOnInvestment(userId, investment.id, principal);

    return investment;
  }

  /** First payout window: next UTC midnight (avoids same-second accrual). */
  private nextInterestDueFrom(from: Date): Date {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /** Daily cron: credit daily yield to wallet; on last day release principal from frozen. */
  async runDailyInterestBatch(): Promise<{ processed: number; skipped: number }> {
    const now = new Date();
    const config = await this.welfare.getConfig();

    if (config.enabled && (isWeekendUTC(now) || isHolidayUTC(now, config.holidayDates))) {
      return { processed: 0, skipped: 0 };
    }

    const rows = await this.prisma.investment.findMany({
      where: {
        status: InvestmentStatus.ACTIVE,
        nextInterestDate: { not: null, lte: now },
      },
      include: { package: true },
    });
    let processed = 0;
    let skipped = 0;
    for (const inv of rows) {
      const accrual = await this.welfare.canAccrueInvestment(inv.userId, now);
      if (!accrual.ok) {
        skipped += 1;
        continue;
      }

      const pkg = inv.package;
      const interest = inv.principalAmount.mul(inv.dailyYieldPercent).div(100);
      const nextDay = inv.nextInterestDate ? this.nextInterestDueFrom(inv.nextInterestDate) : null;
      const daysElapsed = inv.daysElapsed + 1;
      const maturityReached = daysElapsed >= pkg.maturityDays;

      await this.wallet.applyBalanceChange(
        inv.userId,
        WalletTxnType.INTEREST_ACCRUAL,
        { available: interest },
        {
          description: `Daily return — ${pkg.name}`,
          referenceType: 'investment',
          referenceId: inv.id,
        },
      );

      if (!maturityReached) {
        await this.prisma.investment.update({
          where: { id: inv.id },
          data: {
            totalInterestAccrued: inv.totalInterestAccrued.plus(interest),
            daysElapsed,
            nextInterestDate: nextDay,
          },
        });
      } else {
        await this.prisma.investment.update({
          where: { id: inv.id },
          data: {
            totalInterestAccrued: inv.totalInterestAccrued.plus(interest),
            daysElapsed,
            status: InvestmentStatus.MATURED,
            nextInterestDate: null,
          },
        });
        await this.wallet.applyBalanceChange(
          inv.userId,
          WalletTxnType.INVESTMENT_MATURITY,
          { available: inv.principalAmount, frozen: inv.principalAmount.mul(-1) },
          {
            description: `Investment matured — ${pkg.name} principal`,
            referenceType: 'investment',
            referenceId: inv.id,
          },
        );
      }
      processed += 1;
    }
    return { processed, skipped };
  }

  adminListPackages() {
    return this.prisma.investmentPackage.findMany({ orderBy: { price: 'asc' } });
  }

  adminCreatePackage(body: {
    name: string;
    slug: string;
    description?: string;
    dailyYieldPercent: string;
    maturityDays: number;
    minAmount: string;
    maxAmount: string;
    price: string;
    firstTimeBonus?: string;
    isActive?: boolean;
  }) {
    return this.prisma.investmentPackage.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        dailyYieldPercent: new Prisma.Decimal(body.dailyYieldPercent),
        maturityDays: body.maturityDays,
        minAmount: new Prisma.Decimal(body.minAmount),
        maxAmount: new Prisma.Decimal(body.maxAmount),
        price: new Prisma.Decimal(body.price),
        firstTimeBonus: new Prisma.Decimal(body.firstTimeBonus ?? '0'),
        isActive: body.isActive ?? true,
      },
    });
  }

  adminUpdatePackage(
    id: string,
    body: Partial<{
      name: string;
      slug: string;
      description: string | null;
      dailyYieldPercent: string;
      maturityDays: number;
      minAmount: string;
      maxAmount: string;
      price: string;
      firstTimeBonus: string;
      isActive: boolean;
    }>,
  ) {
    const data: Prisma.InvestmentPackageUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.description !== undefined) data.description = body.description;
    if (body.dailyYieldPercent !== undefined) {
      data.dailyYieldPercent = new Prisma.Decimal(body.dailyYieldPercent);
    }
    if (body.maturityDays !== undefined) data.maturityDays = body.maturityDays;
    if (body.minAmount !== undefined) data.minAmount = new Prisma.Decimal(body.minAmount);
    if (body.maxAmount !== undefined) data.maxAmount = new Prisma.Decimal(body.maxAmount);
    if (body.price !== undefined) data.price = new Prisma.Decimal(body.price);
    if (body.firstTimeBonus !== undefined) data.firstTimeBonus = new Prisma.Decimal(body.firstTimeBonus);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.investmentPackage.update({ where: { id }, data });
  }

  adminDeactivatePackage(id: string) {
    return this.prisma.investmentPackage.update({ where: { id }, data: { isActive: false } });
  }
}
