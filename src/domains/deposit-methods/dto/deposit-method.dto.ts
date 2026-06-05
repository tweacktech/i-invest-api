import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDepositMethodDto {
  @IsString()
  code: string;

  @IsString()
  label: string;

  @IsString()
  bankName: string;

  @IsString()
  accountName: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateDepositMethodDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReorderDepositMethodDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}
