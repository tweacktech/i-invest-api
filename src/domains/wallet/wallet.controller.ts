import { Controller, Get, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  getBalance(@CurrentUser() user?: { sub: string }) {
    return this.walletService.getBalance(user?.sub ?? '');
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user?: { sub: string }) {
    return this.walletService.getTransactions(user?.sub ?? '');
  }
}
