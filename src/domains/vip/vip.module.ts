import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';
import { AuthModule } from '../auth/auth.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [
    forwardRef(() => AuthModule), // ← wrap with forwardRef
    PrismaModule,
    PlatformModule,
  ],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
