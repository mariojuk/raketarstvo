import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { CompetitionStatus } from '../../common/types';

export class CreateCompetitionDto {
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(['upcoming', 'active', 'finished'])
  status?: CompetitionStatus;

  @IsInt()
  @IsIn([2, 3])
  launches_per_category!: number;

  @IsOptional()
  @IsInt()
  traka_window_seconds?: number;

  @IsOptional()
  @IsInt()
  padobran_window_seconds?: number;
}

export class UpdateCompetitionDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(['upcoming', 'active', 'finished'])
  status?: CompetitionStatus;

  @IsOptional()
  @IsInt()
  @IsIn([2, 3])
  launches_per_category?: number;

  @IsOptional()
  @IsBoolean()
  traka_open?: boolean;

  @IsOptional()
  @IsBoolean()
  padobran_open?: boolean;

  @IsOptional()
  @IsInt()
  traka_window_seconds?: number;

  @IsOptional()
  @IsInt()
  padobran_window_seconds?: number;
}
