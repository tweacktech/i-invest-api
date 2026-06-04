import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PlatformService } from './platform.service';
import { PublicController } from './public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
