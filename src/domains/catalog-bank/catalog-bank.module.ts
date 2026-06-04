import { Module } from '@nestjs/common';
import { CatalogBankController } from './catalog-bank.controller';
import { CatalogBankService } from './catalog-bank.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}), // uses global JWT config; add options if needed
  ],
  controllers: [CatalogBankController],
  providers: [CatalogBankService],
  exports: [CatalogBankService], // export so other modules (e.g. DepositMethod) can use it
})
export class CatalogBankModule {}
