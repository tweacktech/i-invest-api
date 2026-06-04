import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class PurchaseInvestmentDto {
  @IsString() // ✅ Required - remove @IsOptional()
  packageId!: string; // Use ! to assert it's always present

  @IsOptional()
  @IsNumberString()
  amount?: string;
}
