import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VipService } from './vip.service';


@Controller('vip')
export class VipController {
  constructor(private readonly vip: VipService) {}

  @Get('levels')
  listLevels() {
    return this.vip.listLevels();
  }

  @UseGuards(JwtGuard)
  @Get('status')
  status(@CurrentUser() user: { sub: string }) {
    return this.vip.getStatus(user.sub);
  }
}
