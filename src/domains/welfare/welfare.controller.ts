import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WelfareService } from './welfare.service';

@Controller('welfare')
export class WelfareController {
  constructor(private readonly welfare: WelfareService) {}

  @UseGuards(JwtGuard)
  @Get('status')
  status(@CurrentUser() user: { sub: string }) {
    return this.welfare.userStatus(user.sub);
  }

  @UseGuards(JwtGuard)
  @Post('purchase')
  purchase(@CurrentUser() user: { sub: string }) {
    return this.welfare.purchase(user.sub);
  }
}
