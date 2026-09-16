import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { LaunchCategory } from '../../common/types';

export class SaveLaunchDto {
  @IsUUID()
  competition_id!: string;

  @IsUUID()
  team_id!: string;

  @IsUUID()
  competitor_id!: string;

  @IsEnum(['padobran', 'traka'])
  category!: LaunchCategory;

  @IsInt()
  @Min(1)
  @Max(3)
  attempt_number!: number;

  @IsNumber()
  @Min(0)
  duration_seconds!: number;

  @IsBoolean()
  failed!: boolean;

  @IsOptional()
  @IsDateString()
  session_started_at?: string;
}
