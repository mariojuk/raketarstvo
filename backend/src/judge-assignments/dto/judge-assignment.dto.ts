import { IsOptional, IsUUID } from 'class-validator';

export class CreateJudgeAssignmentDto {
  @IsUUID()
  competition_id!: string;

  @IsUUID()
  judge_id!: string;

  @IsUUID()
  team_id!: string;

  @IsOptional()
  @IsUUID()
  competitor_id?: string;
}
