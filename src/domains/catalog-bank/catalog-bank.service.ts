import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCatalogBankDto, ReorderCatalogBankDto, UpdateCatalogBankDto } from './dto/catalog-bank.dto';

@Injectable()
export class CatalogBankService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(enabledOnly = false) {
    return this.prisma.catalogBank.findMany({
      where: enabledOnly ? { isEnabled: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const bank = await this.prisma.catalogBank.findUnique({ where: { id } });
    if (!bank) throw new NotFoundException(`Bank ${id} not found`);
    return bank;
  }

  async create(dto: CreateCatalogBankDto) {
    // Auto-assign sortOrder to end of list if not provided
    if (dto.sortOrder === undefined) {
      const last = await this.prisma.catalogBank.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      dto.sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    return this.prisma.catalogBank.create({ data: dto });
  }

  async update(id: string, dto: UpdateCatalogBankDto) {
    await this.findOne(id); // ensure exists
    return this.prisma.catalogBank.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.catalogBank.delete({ where: { id } });
  }

  async toggleEnabled(id: string) {
    const bank = await this.findOne(id);
    return this.prisma.catalogBank.update({
      where: { id },
      data: { isEnabled: !bank.isEnabled },
    });
  }

  /** Bulk reorder — accepts array of { id, sortOrder } pairs */
  async reorder(items: ReorderCatalogBankDto[]) {
    await this.prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        this.prisma.catalogBank.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return this.findAll();
  }
}
