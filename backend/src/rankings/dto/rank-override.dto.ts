import {
  IsArray,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { LaunchCategory } from '../../common/types';

export type CompetitorAgeCategoryDto = 'osnovna' | 'srednje';

export class RankOverrideItemDto {
  @IsUUID()
  competitor_id!: string;

  @IsInt()
  @Min(0)
  tie_break_order!: number;
}

export class SaveRankOverridesDto {
  @IsUUID()
  competition_id!: string;

  @IsEnum(['padobran', 'traka'])
  category!: LaunchCategory;

  @IsEnum(['osnovna', 'srednje'])
  age_category!: CompetitorAgeCategoryDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RankOverrideItemDto)
  overrides!: RankOverrideItemDto[];
}
