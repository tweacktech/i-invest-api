import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AccountStatus, KycStatus, Prisma } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RechargeService } from '../recharge/recharge.service';
import { WithdrawalService } from '../withdrawal/withdrawal.service';
import { DailyTaskService } from '../daily-task/daily-task.service';
import { InvestmentService } from '../investment/investment.service';
import { PlatformService } from '../platform/platform.service';
import { AnnouncementService } from '../announcement/announcement.service';
import { StaffUsersService } from './staff-users.service';
import { StaffStatsService } from './staff-stats.service';
import { CreateDailyTaskDto } from '../daily-task/dto/create-daily-task.dto';
import { StaffGuard } from './staff.guard';
import { CurrentStaff } from './current-staff.decorator';
import { StaffUpdateUserDto } from './dto/staff-update-user.dto';
import { RechargeStatus, WithdrawalStatus } from '@prisma/client';
import { VipService } from '../vip/vip.service';

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const t = String(v);
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

@Controller('staff')
@UseGuards(StaffGuard)
export class StaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recharge: RechargeService,
    private readonly withdrawal: WithdrawalService,
    private readonly dailyTasks: DailyTaskService,
    private readonly investments: InvestmentService,
    private readonly platform: PlatformService,
    private readonly announcements: AnnouncementService,
    private readonly users: StaffUsersService,
    private readonly stats: StaffStatsService,
    private readonly vip: VipService,
  ) {}

  @Get('stats/overview')
  statsOverview() {
    return this.stats.overview();
  }

  @Get('recharges')
  listRecharges(@Query('status') status?: RechargeStatus, @Query('take') take?: string) {
    return this.recharge.listAllAdmin(status, take ? Number(take) : 100);
  }

  @Get('recharges/pending')
  pendingRecharges() {
    return this.recharge.listPendingAdmin();
  }

  @Post('recharges/:id/approve')
  approveRecharge(@Param('id') id: string) {
    return this.recharge.approveAdmin(id);
  }

  @Post('recharges/:id/reject')
  rejectRecharge(@Param('id') id: string) {
    return this.recharge.rejectAdmin(id);
  }

  @Get('withdrawals')
  listWithdrawals(@Query('status') status?: WithdrawalStatus, @Query('take') take?: string) {
    return this.withdrawal.listAllAdmin(status, take ? Number(take) : 100);
  }

  @Get('withdrawals/pending')
  pendingWithdrawals() {
    return this.withdrawal.listPendingAdmin();
  }

  @Post('withdrawals/:id/approve')
  approveWithdrawal(@Param('id') id: string) {
    return this.withdrawal.approveAdmin(id);
  }

  @Post('withdrawals/:id/reject')
  rejectWithdrawal(@Param('id') id: string) {
    return this.withdrawal.rejectAdmin(id);
  }

  @Get('daily-tasks')
  listTasks() {
    return this.dailyTasks.adminList();
  }

  @Post('daily-tasks')
  createTask(@Body() dto: CreateDailyTaskDto) {
    return this.dailyTasks.adminCreate({
      title: dto.title,
      youtubeUrl: dto.youtubeUrl,
      watchSeconds: dto.watchSeconds,
      rewardAmount: dto.rewardAmount,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
  }

  @Put('daily-tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      youtubeUrl: string;
      watchSeconds: number;
      rewardAmount: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const patch: {
      title?: string;
      youtubeUrl?: string;
      watchSeconds?: number;
      rewardAmount?: Prisma.Decimal;
      sortOrder?: number;
      isActive?: boolean;
    } = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.youtubeUrl !== undefined) patch.youtubeUrl = body.youtubeUrl;
    if (body.watchSeconds !== undefined) patch.watchSeconds = body.watchSeconds;
    if (body.rewardAmount !== undefined) patch.rewardAmount = new Prisma.Decimal(body.rewardAmount);
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    return this.dailyTasks.adminUpdate(id, patch);
  }

  @Get('deposit-methods')
  listDepositMethods() {
    return this.prisma.depositMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
  }

  @Post('deposit-methods')
  createDepositMethod(
    @Body()
    body: {
      code: string;
      label: string;
      bankName: string;
      accountName: string;
      accountNumber: string;
      isEnabled?: boolean;
      sortOrder?: number;
    },
  ) {
    if (!body.code?.trim()) throw new BadRequestException('code required');
    return this.prisma.depositMethod.create({
      data: {
        code: body.code.trim().toUpperCase(),
        label: body.label,
        bankName: body.bankName,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
        isEnabled: body.isEnabled ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  @Put('deposit-methods/:id')
  updateDepositMethod(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      label: string;
      bankName: string;
      accountName: string;
      accountNumber: string;
      isEnabled: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.prisma.depositMethod.update({ where: { id }, data: body });
  }

  @Get('catalog-banks')
  listCatalogBanks() {
    return this.prisma.catalogBank.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  @Post('catalog-banks')
  createCatalogBank(@Body() body: { name: string; bankCode?: string; isEnabled?: boolean; sortOrder?: number }) {
    return this.prisma.catalogBank.create({
      data: {
        name: body.name,
        bankCode: body.bankCode,
        isEnabled: body.isEnabled ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  @Put('catalog-banks/:id')
  updateCatalogBank(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; bankCode: string | null; isEnabled: boolean; sortOrder: number }>,
  ) {
    return this.prisma.catalogBank.update({ where: { id }, data: body });
  }

  @Delete('catalog-banks/:id')
  deleteCatalogBank(@Param('id') id: string) {
    return this.prisma.catalogBank.delete({ where: { id } });
  }

  @Get('vip-levels')
  listVipLevels() {
    return this.vip.listLevels();
  }

  @Put('vip-levels/:level')
  updateVipLevel(
    @Param('level') level: string,
    @Body()
    body: Partial<{
      levelName: string;
      levelDescription: string | null;
      minInvestmentRequired: string;
      minTeamMembers: number;
      minCommissionEarned: string;
      dividendRate: string;
      weeklySalary: string;
      membersUnlockCount: number;
      maxWithdrawalPercent: string;
      isActive: boolean;
    }>,
  ) {
    const n = Number(level);
    if (!Number.isInteger(n) || n < 0 || n > 8) {
      throw new BadRequestException('Level must be 0–8');
    }
    return this.vip.adminUpdateLevel(n, body);
  }

  @Get('platform/settings')
  platformSettings() {
    return this.platform.getOrCreate();
  }

  @Put('platform/settings')
  updatePlatform(
    @Body()
    body: Partial<{
      maintenanceMode: boolean;
      maintenanceMessage: string | null;
      rechargeTimeoutMinutes: number;
      welfareEnabled: boolean;
      welfareWeeklyPrice: string;
      welfareHolidayDates: string[];
      welcomeMessage: string | null;
      urgentAdminNote: string | null;
      requireActiveInvestmentForWithdrawal: boolean;
    }>,
  ) {
    return this.platform.update(body);
  }

  @Get('investment-packages')
  investmentPackages() {
    return this.investments.adminListPackages();
  }

  @Post('investment-packages')
  createPackage(
    @Body()
    body: {
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
    },
  ) {
    return this.investments.adminCreatePackage(body);
  }

  @Put('investment-packages/:id')
  updatePackage(
    @Param('id') id: string,
    @Body()
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
    return this.investments.adminUpdatePackage(id, body);
  }

  @Delete('investment-packages/:id')
  deactivatePackage(@Param('id') id: string) {
    return this.investments.adminDeactivatePackage(id);
  }

  @Get('export/users')
  async exportUsers(@Res() res: Response) {
    const rows = await this.prisma.user.findMany({
      take: 10_000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phoneNumber: true,
        referralCode: true,
        vipTier: true,
        kycStatus: true,
        accountStatus: true,
        createdAt: true,
      },
    });
    const header = ['id', 'phoneNumber', 'referralCode', 'vipTier', 'kycStatus', 'accountStatus', 'createdAt'];
    const lines = rows.map((r) =>
      [r.id, r.phoneNumber, r.referralCode, r.vipTier, r.kycStatus, r.accountStatus, r.createdAt.toISOString()]
        .map(csvEscape)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    return res.send(csv);
  }

  @Get('export/recharges')
  async exportRecharges(@Res() res: Response) {
    const rows = await this.prisma.rechargeRequest.findMany({
      take: 10_000,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { phoneNumber: true } }, depositMethod: true },
    });
    const header = [
      'id',
      'userPhone',
      'amount',
      'channel',
      'status',
      'transferNarration',
      'expiresAt',
      'depositCode',
      'createdAt',
    ];
    const lines = rows.map((r) =>
      [
        r.id,
        r.user.phoneNumber,
        r.amount.toString(),
        r.channel,
        r.status,
        r.transferNarration ?? '',
        r.expiresAt?.toISOString() ?? '',
        r.depositMethod?.code ?? '',
        r.createdAt.toISOString(),
      ]
        .map(csvEscape)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="recharges.csv"');
    return res.send(csv);
  }

  @Get('export/withdrawals')
  async exportWithdrawals(@Res() res: Response) {
    const rows = await this.prisma.withdrawalRequest.findMany({
      take: 10_000,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { phoneNumber: true } },
        bankAccount: true,
      },
    });
    const header = [
      'id',
      'userPhone',
      'amount',
      'status',
      'bankName',
      'accountName',
      'accountNumber',
      'createdAt',
    ];
    const lines = rows.map((r) =>
      [
        r.id,
        r.user.phoneNumber,
        r.amount.toString(),
        r.status,
        r.bankAccount.bankName,
        r.bankAccount.accountName,
        r.bankAccount.accountNumber,
        r.createdAt.toISOString(),
      ]
        .map(csvEscape)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="withdrawals.csv"');
    return res.send(csv);
  }

  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('status') status?: AccountStatus,
    @Query('kyc') kyc?: KycStatus,
  ) {
    return this.users.list({ search, status, kyc });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: StaffUpdateUserDto) {
    return this.users.updateProfile(id, dto);
  }

  @Post('users/:id/verify-kyc')
  verifyKyc(@Param('id') id: string) {
    return this.users.verifyKyc(id);
  }

  @Post('users/:id/reject-kyc')
  rejectKyc(@Param('id') id: string) {
    return this.users.rejectKyc(id);
  }

  @Post('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.users.suspend(id);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.users.ban(id);
  }

  @Post('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.users.activate(id);
  }

  @Get('announcements')
  staffAnnouncements() {
    return this.announcements.staffList();
  }

  @Post('announcements')
  createAnnouncement(@Body() body: { title: string; body: string }) {
    if (!body.title?.trim() || !body.body?.trim()) {
      throw new BadRequestException('Title and body are required');
    }
    return this.announcements.staffCreate({ title: body.title.trim(), body: body.body.trim() });
  }

  @Put('announcements/:id')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; body: string; isActive: boolean }>,
  ) {
    return this.announcements.staffUpdate(id, body);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.announcements.staffDelete(id);
  }
}
