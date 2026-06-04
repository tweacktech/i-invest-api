import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { DailyTaskController } from './daily-task.controller';
import { DailyTaskService } from './daily-task.service';

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [DailyTaskController],
  providers: [DailyTaskService],
  exports: [DailyTaskService],
})
export class DailyTaskModule {}
