import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { PlatformModule } from '../platform/platform.module';
import { RechargeController } from './recharge.controller';
import { RechargeService } from './recharge.service';
import { RechargeExpiryJob } from './recharge-expiry.job';

@Module({
  imports: [AuthModule, WalletModule, PlatformModule],
  controllers: [RechargeController],
  providers: [RechargeService, RechargeExpiryJob],
  exports: [RechargeService],
})
export class RechargeModule {}
