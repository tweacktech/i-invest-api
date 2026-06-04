import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCatalogBankDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCatalogBankDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReorderCatalogBankDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}
