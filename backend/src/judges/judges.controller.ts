import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators';
import { CreateJudgeDto, UpdateJudgeDto } from './dto/judge.dto';
import { JudgesService } from './judges.service';

@Controller('judges')
@Roles('admin')
export class JudgesController {
  constructor(private readonly judgesService: JudgesService) {}

  @Get()
  findAll() {
    return this.judgesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.judgesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateJudgeDto) {
    return this.judgesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJudgeDto) {
    return this.judgesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.judgesService.remove(id);
  }
}
