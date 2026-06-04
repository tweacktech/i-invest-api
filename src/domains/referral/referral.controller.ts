import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(JwtGuard)
export class ReferralController {
  constructor(private readonly referral: ReferralService) {}

  @Get('summary')
  summary(@CurrentUser() user: { sub: string }) {
    return this.referral.getSummary(user.sub);
  }

  @Get('team')
  team(@CurrentUser() user: { sub: string }) {
    return this.referral.getTeam(user.sub);
  }

  @Get('commissions')
  commissions(@CurrentUser() user: { sub: string }) {
    return this.referral.getCommissions(user.sub);
  }
}
