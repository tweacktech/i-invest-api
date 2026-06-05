import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DepositMethodService } from './deposit-method.service';
import {
  CreateDepositMethodDto,
  ReorderDepositMethodDto,
  UpdateDepositMethodDto,
} from './dto/deposit-method.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('deposit-methods')
export class DepositMethodController {
  constructor(private readonly service: DepositMethodService) {}

  /** Public — for recharge page dropdowns (no auth) */
  @Get('public')
  listPublic() {
    return this.service.findAll(true);
  }

  /** Admin — full list */
  @UseGuards(JwtGuard)
  @Get()
  findAll(@Query('enabledOnly') enabledOnly?: string) {
    return this.service.findAll(enabledOnly === 'true');
  }

  /** Must be before :id routes */
  @UseGuards(JwtGuard)
  @Post('reorder')
  reorder(@Body() items: ReorderDepositMethodDto[]) {
    return this.service.reorder(items);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() dto: CreateDepositMethodDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepositMethodDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    console.log('yess');
    return this.service.toggleEnabled(id);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}