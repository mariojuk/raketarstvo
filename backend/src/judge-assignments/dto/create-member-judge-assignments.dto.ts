import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

export class MemberJudgeAssignmentItemDto {
  @IsUUID()
  judge_id!: string;

  @IsUUID()
  competitor_id!: string;
}

export class CreateMemberJudgeAssignmentsDto {
  @IsUUID()
  competition_id!: string;

  @IsUUID()
  team_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemberJudgeAssignmentItemDto)
  assignments!: MemberJudgeAssignmentItemDto[];
}
