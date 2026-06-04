import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpsertBankDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @Length(2, 120)
  accountName!: string;

  @IsString()
  @Length(2, 120)
  bankName!: string;

  @IsString()
  @Length(10, 16)
  @Matches(/^\d+$/, { message: 'Account number must be digits' })
  accountNumber!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
