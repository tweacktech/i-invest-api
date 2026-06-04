import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpsertBankDto } from './dto/upsert-bank.dto';
import { SetWithdrawalPinDto } from './dto/set-withdrawal-pin.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(JwtGuard)
  @Get('profile')
  profile(@CurrentUser() user: { sub: string }) {
    return this.settingsService.profile(user.sub);
  }

  @UseGuards(JwtGuard)
  @Put('bank')
  upsertBank(@CurrentUser() user: { sub: string }, @Body() dto: UpsertBankDto) {
    return this.settingsService.upsertBank(user.sub, dto);
  }

  @UseGuards(JwtGuard)
  @Put('withdrawal-pin')
  setPin(@CurrentUser() user: { sub: string }, @Body() dto: SetWithdrawalPinDto) {
    return this.settingsService.setWithdrawalPin(user.sub, dto.pin);
  }
}
