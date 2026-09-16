import { Module } from '@nestjs/common';
import { CompetitionTeamsModule } from '../competition-teams/competition-teams.module';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

@Module({
  imports: [CompetitionTeamsModule],
  controllers: [RankingsController],
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
