import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { Public, Roles } from '../common/decorators';
import type { LaunchCategory } from '../common/types';
import { SaveRankOverridesDto } from './dto/rank-override.dto';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Public()
  @Get()
  findByCompetition(
    @Query('competition_id') competitionId: string,
    @Query('category') category?: LaunchCategory,
  ) {
    return this.rankingsService.findByCompetition(competitionId, category);
  }

  @Roles('admin')
  @Put()
  save(@Body() dto: SaveRankOverridesDto) {
    return this.rankingsService.save(dto);
  }
}
