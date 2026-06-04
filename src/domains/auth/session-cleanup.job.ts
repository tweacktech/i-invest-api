import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class SessionCleanupJob {
  private readonly log = new Logger(SessionCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Remove expired refresh-token sessions. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredSessions() {
    const res = await this.prisma.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (res.count > 0) {
      this.log.log(`Removed ${res.count} expired user session(s)`);
    }
  }
}
