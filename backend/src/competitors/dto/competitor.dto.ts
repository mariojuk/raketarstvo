import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCompetitorDto {
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  club_id!: string;

  @IsIn(['osnovna', 'srednje'])
  age_category!: 'osnovna' | 'srednje';
}

export class UpdateCompetitorDto {
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  club_id!: string;

  @IsIn(['osnovna', 'srednje'])
  age_category!: 'osnovna' | 'srednje';
}
