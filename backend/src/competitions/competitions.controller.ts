import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public, Roles } from '../common/decorators';
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto/competition.dto';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Public()
  @Get()
  findAll(@Query('status') status?: string) {
    return this.competitionsService.findAll(status);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competitionsService.findOneWithDetails(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCompetitionDto) {
    return this.competitionsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.competitionsService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.competitionsService.remove(id);
  }
}
