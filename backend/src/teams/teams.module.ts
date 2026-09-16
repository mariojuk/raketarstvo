import { Module } from '@nestjs/common';
import { CompetitionTeamsModule } from '../competition-teams/competition-teams.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [CompetitionTeamsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
