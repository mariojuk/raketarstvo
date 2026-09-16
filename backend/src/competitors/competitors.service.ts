import { Injectable, NotFoundException } from '@nestjs/common';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCompetitorDto, UpdateCompetitorDto } from './dto/competitor.dto';

@Injectable()
export class CompetitorsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    return unwrapSupabase(
      await this.supabase.db
        .from('competitors')
        .select('*, club:clubs(*)')
        .order('name'),
    );
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('competitors')
      .select('*, club:clubs(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Natjecatelj nije pronađen');
    }

    return data;
  }

  async create(dto: CreateCompetitorDto) {
    return unwrapSupabase(
      await this.supabase.db
        .from('competitors')
        .insert(dto)
        .select('*, club:clubs(*)')
        .single(),
    );
  }

  async update(id: string, dto: UpdateCompetitorDto) {
    return unwrapSupabase(
      await this.supabase.db
        .from('competitors')
        .update(dto)
        .eq('id', id)
        .select('*, club:clubs(*)')
        .single(),
    );
  }

  async remove(id: string) {
    return unwrapSupabase(await this.supabase.db.from('competitors').delete().eq('id', id));
  }
}
