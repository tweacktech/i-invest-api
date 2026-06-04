import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @UseGuards(JwtGuard)
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalService.create(user.sub, dto.bankAccountId, dto.amount, dto.withdrawalPin);
  }

  @UseGuards(JwtGuard)
  @Get('limits')
  limits(@CurrentUser() user: { sub: string }) {
    return this.withdrawalService.getLimits(user.sub);
  }

  @UseGuards(JwtGuard)
  @Get()
  mine(@CurrentUser() user: { sub: string }) {
    return this.withdrawalService.listMine(user.sub);
  }
}
