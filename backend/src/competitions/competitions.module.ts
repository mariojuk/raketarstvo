import { Module } from '@nestjs/common';
import { CompetitionTeamsModule } from '../competition-teams/competition-teams.module';
import { RankingsModule } from '../rankings/rankings.module';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';

@Module({
  imports: [CompetitionTeamsModule, RankingsModule],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
