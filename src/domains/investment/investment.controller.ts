import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvestmentService } from './investment.service';
import { PurchaseInvestmentDto } from './dto/purchase-investment.dto';

@Controller('investments')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Get('packages')
  listPackages() {
    return this.investmentService.listPackages();
  }

  @UseGuards(JwtGuard)
  @Get('mine')
  mine(@CurrentUser() user?: { sub: string }) {
    return this.investmentService.listMine(user?.sub ?? '');
  }

  // @UseGuards(JwtGuard)
  // @Post('purchase')
  // purchase(@CurrentUser() user: { sub: string } | undefined, @Body() dto: PurchaseInvestmentDto) {

  //   return this.investmentService.purchase(user?.sub ?? '', dto.packageId, dto.amount);
  // }

  @UseGuards(JwtGuard)
  @Post('purchase')
  purchase(@CurrentUser() user: { sub: string } | undefined, @Body() dto: PurchaseInvestmentDto) {
    return this.investmentService.purchase(
      user?.sub ?? '', 
      dto.packageId ?? '', 
      dto.amount // This can be undefined, which is fine if service accepts it
    );
    
  }

}
