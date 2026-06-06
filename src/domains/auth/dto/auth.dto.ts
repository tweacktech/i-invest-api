import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^(\+234|0)\d{10}$/, {
    message: 'Phone must be in 080XXXXXXXX, 090XXXXXXXX or +234XXXXXXXXXX format'})
  phoneNumber!: string;

  // @IsString()
  // @MinLength(6)
  // @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
  //   message: 'Password must contain uppercase, number and special character',
  // })
  // password!: string;
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters',
  })
  password!: string;

  // @IsOptional()
  @IsString()
  referralCode?: string;
}

export class LoginDto {
  @IsString()
  phoneNumber!: string;

  @IsString()
  password!: string;
}
