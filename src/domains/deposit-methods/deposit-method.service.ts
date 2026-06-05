import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateDepositMethodDto,
  ReorderDepositMethodDto,
  UpdateDepositMethodDto,
} from './dto/deposit-method.dto';

@Injectable()
export class DepositMethodService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(enabledOnly = false) {
    return this.prisma.depositMethod.findMany({
      where: enabledOnly ? { isEnabled: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findOne(id: string) {
    const method = await this.prisma.depositMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException(`Deposit method ${id} not found`);
    return method;
  }

  async create(dto: CreateDepositMethodDto) {
    const existing = await this.prisma.depositMethod.findUnique({
      where: { code: dto.code },
      select: { id: true },
    });
    if (existing) throw new BadRequestException(`Code "${dto.code}" is already in use`);

    if (dto.sortOrder === undefined) {
      const last = await this.prisma.depositMethod.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      dto.sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    return this.prisma.depositMethod.create({ data: dto });
  }

  async update(id: string, dto: UpdateDepositMethodDto) {
    await this.findOne(id);

    if (dto.code) {
      const clash = await this.prisma.depositMethod.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw new BadRequestException(`Code "${dto.code}" is already in use`);
    }

    return this.prisma.depositMethod.update({ where: { id }, data: dto });
  }

  async toggleEnabled(id: string) {
    const method = await this.findOne(id);
    return this.prisma.depositMethod.update({
      where: { id },
      data: { isEnabled: !method.isEnabled },
    });
  }

  async reorder(items: ReorderDepositMethodDto[]) {
    await this.prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        this.prisma.depositMethod.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return this.findAll();
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if any recharge requests reference this method
    const linked = await this.prisma.rechargeRequest.count({
      where: { depositMethodId: id },
    });
    if (linked > 0) {
      throw new BadRequestException(
        `Cannot delete — ${linked} recharge request(s) reference this deposit method. Disable it instead.`,
      );
    }

    return this.prisma.depositMethod.delete({ where: { id } });
  }
}
