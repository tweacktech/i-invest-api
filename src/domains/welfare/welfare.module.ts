import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { PlatformModule } from '../platform/platform.module';
import { WelfareController } from './welfare.controller';
import { WelfareService } from './welfare.service';

@Module({
  imports: [AuthModule, WalletModule, PlatformModule],
  controllers: [WelfareController],
  providers: [WelfareService],
  exports: [WelfareService],
})
export class WelfareModule {}
