import { IsUUID } from 'class-validator';

export class RegisterCompetitionTeamDto {
  @IsUUID()
  competition_id!: string;

  @IsUUID()
  team_id!: string;
}
