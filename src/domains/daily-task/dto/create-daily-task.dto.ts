import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyTaskDto {
  @IsString()
  title!: string;

  /** Full URL to YouTube watch page */
  @IsString()
  youtubeUrl!: string;

  @IsInt()
  @Min(5)
  watchSeconds!: number;

  @IsString()
  rewardAmount!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
