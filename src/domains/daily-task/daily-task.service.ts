import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class DailyTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  listActive() {
    return this.prisma.dailyTask.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        youtubeUrl: true,
        watchSeconds: true,
        rewardAmount: true,
        sortOrder: true,
      },
    });
  }

  async start(userId: string, taskId: string) {
    const task = await this.prisma.dailyTask.findFirst({
      where: { id: taskId, isActive: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.dailyTaskProgress.upsert({
      where: {
        userId_taskId: { userId, taskId },
      },
      create: { userId, taskId },
      update: { startedAt: new Date() },
    });
  }

  async claim(userId: string, taskId: string) {
    const task = await this.prisma.dailyTask.findFirst({
      where: { id: taskId, isActive: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const progress = await this.prisma.dailyTaskProgress.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (!progress) {
      throw new BadRequestException('Start the task before claiming');
    }

    const elapsedMs = Date.now() - progress.startedAt.getTime();
    if (elapsedMs < task.watchSeconds * 1000) {
      throw new BadRequestException('Watch timer not completed yet');
    }

    const now = new Date();
    const completedFor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const existing = await this.prisma.dailyTaskCompletion.findUnique({
      where: {
        userId_taskId_completedFor: { userId, taskId, completedFor },
      },
    });
    if (existing) {
      throw new BadRequestException('Reward already claimed for today');
    }

    await this.wallet.applyBalanceChange(
      userId,
      WalletTxnType.TASK_REWARD,
      { available: task.rewardAmount },
      {
        description: `Daily task: ${task.title}`,
        referenceType: 'daily_task',
        referenceId: task.id,
      },
    );

    return this.prisma.dailyTaskCompletion.create({
      data: {
        userId,
        taskId,
        rewardAmount: task.rewardAmount,
        completedFor,
      },
    });
  }

  async myStatus(userId: string) {
    const tasks = await this.listActive();
    const now = new Date();
    const completedFor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const completions = await this.prisma.dailyTaskCompletion.findMany({
      where: { userId, completedFor },
      select: { taskId: true },
    });
    const done = new Set(completions.map((c) => c.taskId));

    const progress = await this.prisma.dailyTaskProgress.findMany({
      where: { userId },
    });
    const progressMap = new Map(progress.map((p) => [p.taskId, p.startedAt]));

    return tasks.map((t) => ({
      ...t,
      startedAt: progressMap.get(t.id) ?? null,
      claimedToday: done.has(t.id),
    }));
  }

  async adminCreate(data: {
    title: string;
    youtubeUrl: string;
    watchSeconds: number;
    rewardAmount: Prisma.Decimal | string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.dailyTask.create({
      data: {
        title: data.title,
        youtubeUrl: data.youtubeUrl,
        watchSeconds: data.watchSeconds,
        rewardAmount: new Prisma.Decimal(data.rewardAmount as string),
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async adminUpdate(
    id: string,
    patch: Partial<{
      title: string;
      youtubeUrl: string;
      watchSeconds: number;
      rewardAmount: Prisma.Decimal;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.dailyTask.update({
      where: { id },
      data: patch,
    });
  }

  async adminList() {
    return this.prisma.dailyTask.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
