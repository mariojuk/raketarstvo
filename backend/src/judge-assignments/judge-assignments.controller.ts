import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../common/decorators';
import { User } from '../common/types';
import { CreateJudgeAssignmentDto } from './dto/judge-assignment.dto';
import { CreateMemberJudgeAssignmentsDto } from './dto/create-member-judge-assignments.dto';
import { JudgeAssignmentsService } from './judge-assignments.service';

@Controller('judge-assignments')
export class JudgeAssignmentsController {
  constructor(private readonly judgeAssignmentsService: JudgeAssignmentsService) {}

  @Roles('admin')
  @Get()
  findByCompetition(@Query('competition_id') competitionId: string) {
    return this.judgeAssignmentsService.findByCompetition(competitionId);
  }

  @Roles('judge')
  @Get('my')
  findMine(@Req() req: { user: User }) {
    return this.judgeAssignmentsService.findForJudge(req.user.id);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateJudgeAssignmentDto) {
    return this.judgeAssignmentsService.create(dto);
  }

  @Roles('admin')
  @Post('members')
  createForMembers(@Body() dto: CreateMemberJudgeAssignmentsDto) {
    return this.judgeAssignmentsService.createMemberAssignments(dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.judgeAssignmentsService.remove(id);
  }
}
