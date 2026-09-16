import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Public, Roles } from '../common/decorators';
import { User } from '../common/types';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Roles('admin')
  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Public()
  @Get('competition/:competitionId')
  findByCompetition(@Param('competitionId') competitionId: string) {
    return this.teamsService.findByCompetition(competitionId);
  }

  @Roles('judge')
  @Get('my-teams')
  findMyTeams(@Req() req: { user: User }) {
    return this.teamsService.findJudgeTeams(req.user.id);
  }

  @Roles('judge')
  @Get('my-teams/competition/:competitionId')
  findMyTeamsForCompetition(
    @Req() req: { user: User },
    @Param('competitionId') competitionId: string,
  ) {
    return this.teamsService.findJudgeTeams(req.user.id, competitionId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
