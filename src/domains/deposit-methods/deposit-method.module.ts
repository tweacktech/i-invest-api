import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DepositMethodController } from './deposit-method.controller';
import { DepositMethodService } from './deposit-method.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [DepositMethodController],
  providers: [DepositMethodService],
  exports: [DepositMethodService],
})
export class DepositMethodModule {}
