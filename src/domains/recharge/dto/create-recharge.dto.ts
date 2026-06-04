import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { RechargeChannel } from '@prisma/client';

export class CreateRechargeDto {
  @IsNumberString()
  amount!: string;

  @IsEnum(RechargeChannel)
  channel!: RechargeChannel;

  /** Required when channel is MANUAL — one of the admin-configured transfer accounts (A–D). */
  @IsOptional()
  @IsString()
  depositMethodId?: string;
}
