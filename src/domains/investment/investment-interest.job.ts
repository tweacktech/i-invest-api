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
    this.log.log('🔄 Daily interest job started');
    await this.runBatch('daily');
  }

  /** Catch-up for due investments if the server was down or welfare was paid mid-day. */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourly() {
    this.log.log('🔄 Hourly interest job started');
    await this.runBatch('hourly');
  }

  private async runBatch(label: string) {
    const startTime = Date.now();
    this.log.log(`[${label}] Starting interest batch...`);

    try {
      // Log before calling the service
      this.log.log(`[${label}] Calling investments.runDailyInterestBatch()...`);

      const result = await this.investments.runDailyInterestBatch();

      this.log.log(`[${label}] Result: ${JSON.stringify(result)}`);

      if (result.processed > 0 || result.skipped > 0) {
        this.log.log(
          `✅ [${label}] Investment interest: ${result.processed} credited, ${result.skipped} skipped (welfare/weekend/holiday/unpaid)`,
        );
      } else {
        this.log.warn(`⚠️ [${label}] No investments processed. Check conditions.`);
      }

      const duration = Date.now() - startTime;
      this.log.log(`⏱️ [${label}] Job completed in ${duration}ms`);
    } catch (e) {
      const error = e as Error;
      this.log.error(`❌ [${label}] Error: ${error.message}`);
      this.log.error(`❌ [${label}] Stack trace: ${error.stack}`);
    }
  }

  // Add a manual trigger for debugging
  async triggerManual() {
    this.log.log('🔄 Manual trigger called');
    await this.runBatch('manual');
    return { success: true, message: 'Manual trigger completed' };
  }
}