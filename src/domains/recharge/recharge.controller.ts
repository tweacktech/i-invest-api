import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RechargeService } from './recharge.service';
import { CreateRechargeDto } from './dto/create-recharge.dto';

@Controller('recharge')
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  @UseGuards(JwtGuard)
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateRechargeDto) {
    return this.rechargeService.create(user.sub, dto.amount, dto.channel, dto.depositMethodId);
  }

  @UseGuards(JwtGuard)
  @Get('requests')
  mine(@CurrentUser() user: { sub: string }) {
    return this.rechargeService.listMine(user.sub);
  }

  /**
   * Used by the confirm page to poll the status of a single recharge.
   * Ownership is enforced — users can only fetch their own requests.
   */
  @UseGuards(JwtGuard)
  @Get('requests/:id')
  findOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.rechargeService.findOne(user.sub, id);
  }

  /**
   * User taps "I have paid" on the confirm page.
   * This does NOT credit the wallet — it just flags the request so staff
   * can see it has been claimed and prioritise review.
   */
  @UseGuards(JwtGuard)
  @Post('requests/:id/notify-paid')
  notifyPaid(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.rechargeService.notifyPaid(user.sub, id);
  }
}