import { Module } from '@nestjs/common';
import { JudgeAssignmentsController } from './judge-assignments.controller';
import { JudgeAssignmentsService } from './judge-assignments.service';

@Module({
  controllers: [JudgeAssignmentsController],
  providers: [JudgeAssignmentsService],
  exports: [JudgeAssignmentsService],
})
export class JudgeAssignmentsModule {}
