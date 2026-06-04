import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './domains/auth/auth.module';
import { WalletModule } from './domains/wallet/wallet.module';
import { InvestmentModule } from './domains/investment/investment.module';
import { RechargeModule } from './domains/recharge/recharge.module';
import { WithdrawalModule } from './domains/withdrawal/withdrawal.module';
import { SettingsModule } from './domains/settings/settings.module';
import { DailyTaskModule } from './domains/daily-task/daily-task.module';
import { StaffModule } from './domains/staff/staff.module';
import { PlatformModule } from './domains/platform/platform.module';
import { AnnouncementModule } from './domains/announcement/announcement.module';
import { ReferralModule } from './domains/referral/referral.module';
import { WelfareModule } from './domains/welfare/welfare.module';
import { VipModule } from './domains/vip/vip.module';
import { MaintenanceMiddleware } from './domains/platform/maintenance.middleware';
import { ApiKeyMiddleware } from './shared/middleware/api-key.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PlatformModule,
    AuthModule,
    WalletModule,
    InvestmentModule,
    RechargeModule,
    WithdrawalModule,
    SettingsModule,
    DailyTaskModule,
    StaffModule,
    AnnouncementModule,
    ReferralModule,
    WelfareModule,
    VipModule,
  ],
  controllers: [AppController],
  providers: [AppService, MaintenanceMiddleware, ApiKeyMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes('*');
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
  }
}
