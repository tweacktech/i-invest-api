import { IsString, Length } from 'class-validator';

export class SetWithdrawalPinDto {
  @IsString()
  @Length(4, 12)
  pin!: string;
}
