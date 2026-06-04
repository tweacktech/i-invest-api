import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RechargeService } from './recharge.service';

@Injectable()
export class RechargeExpiryJob {
  private readonly log = new Logger(RechargeExpiryJob.name);

  constructor(private readonly recharge: RechargeService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expirePending() {
    const n = await this.recharge.expireStalePending();
    if (n > 0) this.log.log(`Expired ${n} stale recharge request(s)`);
  }
}
