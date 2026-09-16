import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Public, Roles } from '../common/decorators';
import { RegisterCompetitionTeamDto } from './dto/competition-team.dto';
import { CompetitionTeamsService } from './competition-teams.service';

@Controller('competition-teams')
export class CompetitionTeamsController {
  constructor(private readonly competitionTeamsService: CompetitionTeamsService) {}

  @Public()
  @Get()
  findByCompetition(@Query('competition_id') competitionId: string) {
    return this.competitionTeamsService.findByCompetition(competitionId);
  }

  @Roles('admin')
  @Post()
  register(@Body() dto: RegisterCompetitionTeamDto) {
    return this.competitionTeamsService.register(dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.competitionTeamsService.remove(id);
  }
}
