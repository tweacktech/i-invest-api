import { IsNumberString, IsString, Length } from 'class-validator';

export class CreateWithdrawalDto {
  @IsString()
  bankAccountId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(4, 12)
  withdrawalPin!: string;
}
