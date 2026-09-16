import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public, Roles } from '../common/decorators';
import { CompetitorsService } from './competitors.service';
import { CreateCompetitorDto, UpdateCompetitorDto } from './dto/competitor.dto';

@Controller('competitors')
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Public()
  @Get()
  findAll() {
    return this.competitorsService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competitorsService.findOne(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCompetitorDto) {
    return this.competitorsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompetitorDto) {
    return this.competitorsService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.competitorsService.remove(id);
  }
}
