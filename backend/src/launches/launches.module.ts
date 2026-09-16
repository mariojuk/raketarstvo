import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module';
import { JudgeAssignmentsModule } from '../judge-assignments/judge-assignments.module';
import { LaunchesController } from './launches.controller';
import { LaunchesService } from './launches.service';

@Module({
  imports: [JudgeAssignmentsModule, CompetitionsModule],
  controllers: [LaunchesController],
  providers: [LaunchesService],
  exports: [LaunchesService],
})
export class LaunchesModule {}
