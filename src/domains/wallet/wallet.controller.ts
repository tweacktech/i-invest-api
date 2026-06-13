import { Controller, Get, UseGuards,Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WalletTxnType } from '@prisma/client';

@UseGuards(JwtGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  getBalance(@CurrentUser() user?: { sub: string }) {
    return this.walletService.getBalance(user?.sub ?? '');
  }

  // @Get('transactions')
  // getTransactions(@CurrentUser() user?: { sub: string }) {
  //   return this.walletService.getTransactions(user?.sub ?? '');
  // }
  @Get('transactions')
  getTransactions(
    @CurrentUser() user?: { sub: string },

    @Query('type')
    type?: WalletTxnType,

    @Query('days')
    days?: string,
  ) {
    return this.walletService.getTransactions(
      user?.sub ?? '',
      type,
      days,
    );
  }
}
