import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { RechargeModule } from '../recharge/recharge.module';
import { WithdrawalModule } from '../withdrawal/withdrawal.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';
import { InvestmentModule } from '../investment/investment.module';
import { PlatformModule } from '../platform/platform.module';
import { AnnouncementModule } from '../announcement/announcement.module';
import { VipModule } from '../vip/vip.module';
import { StaffAuthController } from './staff-auth.controller';
import { StaffController } from './staff.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffUsersService } from './staff-users.service';
import { StaffStatsService } from './staff-stats.service';
import { StaffGuard } from './staff.guard';
import { STAFF_JWT } from './staff-jwt.constants';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PlatformModule,
    RechargeModule,
    WithdrawalModule,
    DailyTaskModule,
    InvestmentModule,
    AnnouncementModule,
    VipModule,
  ],
  controllers: [StaffAuthController, StaffController],
  providers: [
    StaffAuthService,
    StaffUsersService,
    StaffStatsService,
    StaffGuard,
    {
      provide: STAFF_JWT,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('STAFF_JWT_SECRET') ?? `${config.get<string>('JWT_SECRET', 'dev-secret')}-staff`,
        }),
      inject: [ConfigService],
    },
  ],
})
export class StaffModule {}
