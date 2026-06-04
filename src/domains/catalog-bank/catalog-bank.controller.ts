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
import { CatalogBankService } from './catalog-bank.service';
import { CreateCatalogBankDto, ReorderCatalogBankDto, UpdateCatalogBankDto } from './dto/catalog-bank.dto';
import { JwtGuard } from '../auth/jwt.guard';
// import { AdminGuard } from '../auth/admin.guard'; // uncomment if you have role guard

@Controller('catalog-banks')
export class CatalogBankController {
  constructor(private readonly service: CatalogBankService) {}

  /** Public — used by frontend dropdowns (enabled only) */
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

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() dto: CreateCatalogBankDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCatalogBankDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggleEnabled(id);
  }

  @UseGuards(JwtGuard)
  @Post('reorder')
  reorder(@Body() items: ReorderCatalogBankDto[]) {
    return this.service.reorder(items);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
