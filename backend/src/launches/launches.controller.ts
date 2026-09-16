import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Public, Roles } from '../common/decorators';
import { User } from '../common/types';
import { SaveLaunchDto } from './dto/launch.dto';
import { UpdateLaunchDto } from './dto/update-launch.dto';
import { LaunchesService } from './launches.service';

@Controller('launches')
export class LaunchesController {
  constructor(private readonly launchesService: LaunchesService) {}

  @Public()
  @Get('competition/:competitionId')
  findByCompetition(@Param('competitionId') competitionId: string) {
    return this.launchesService.findByCompetition(competitionId);
  }

  @Roles('judge', 'admin')
  @Get('team/:teamId')
  findByTeam(@Param('teamId') teamId: string, @Req() req: { user: User }) {
    return this.launchesService.findByTeam(teamId, req.user);
  }

  @Roles('judge', 'admin')
  @Post()
  save(@Body() dto: SaveLaunchDto, @Req() req: { user: User }) {
    return this.launchesService.save(dto, req.user);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLaunchDto,
    @Req() req: { user: User },
  ) {
    return this.launchesService.update(id, dto, req.user);
  }
}
