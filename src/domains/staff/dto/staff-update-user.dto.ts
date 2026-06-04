import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class StaffUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  withdrawalPin?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  vipTier?: number;
}
