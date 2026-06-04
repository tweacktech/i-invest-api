import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { VipModule } from '../vip/vip.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { SessionCleanupJob } from './session-cleanup.job';

@Module({
  imports: [
    PrismaModule,
    VipModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, SessionCleanupJob],
  exports: [AuthService, JwtGuard, JwtModule],
})
export class AuthModule {}
