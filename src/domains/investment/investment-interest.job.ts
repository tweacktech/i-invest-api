import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvestmentService } from './investment.service';

@Injectable()
export class InvestmentInterestJob {
  private readonly log = new Logger(InvestmentInterestJob.name);

  constructor(private readonly investments: InvestmentService) {}

  /** Primary accrual window — runs once per day at 01:00 UTC. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runDaily() {
    await this.runBatch('daily');
  }

  /** Catch-up for due investments if the server was down or welfare was paid mid-day. */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourly() {
    await this.runBatch('hourly');
  }

  private async runBatch(label: string) {
    try {
      const { processed, skipped } = await this.investments.runDailyInterestBatch();
      if (processed > 0 || skipped > 0) {
        this.log.log(
          `[${label}] Investment interest: ${processed} credited, ${skipped} skipped (welfare/weekend/holiday/unpaid)`,
        );
      }
    } catch (e) {
      this.log.error(`[${label}] ${(e as Error).message}`);
    }
  }
}
