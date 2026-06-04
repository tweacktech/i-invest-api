import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StaffAuthService } from './staff-auth.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffGuard } from './staff.guard';
import { CurrentStaff } from './current-staff.decorator';

@Controller('staff/auth')
export class StaffAuthController {
  constructor(private readonly auth: StaffAuthService) {}

  @Post('login')
  login(@Body() dto: StaffLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(StaffGuard)
  @Get('me')
  me(@CurrentStaff() staff: { adminId: string }) {
    return this.auth.me(staff.adminId);
  }
}
