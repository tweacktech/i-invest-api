import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginUser(dto);
  }

  // @Get('test')
  // test() {
  //   return 'yes.';
  // }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user?: { sub: string }) {
    return this.authService.getUserById(user?.sub ?? '');
  }
}
