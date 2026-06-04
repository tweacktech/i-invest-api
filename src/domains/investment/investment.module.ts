import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralModule } from '../referral/referral.module';
import { VipModule } from '../vip/vip.module';
import { WelfareModule } from '../welfare/welfare.module';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { InvestmentInterestJob } from './investment-interest.job';

@Module({
  imports: [AuthModule, WalletModule, ReferralModule, VipModule, WelfareModule],
  controllers: [InvestmentController],
  providers: [InvestmentService, InvestmentInterestJob],
  exports: [InvestmentService],
})
export class InvestmentModule {}
