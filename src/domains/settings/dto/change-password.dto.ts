// dto/change-password.dto.ts
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(10, { message: 'Password must not exceed 10 characters' })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
  //   message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  // })
  newPassword: string;
}
