import { Injectable, NotFoundException } from '@nestjs/common';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateClubDto, UpdateClubDto } from './dto/club.dto';

@Injectable()
export class ClubsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    return unwrapSupabase(await this.supabase.db.from('clubs').select('*').order('name'));
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Klub nije pronađen');
    }

    return data;
  }

  async create(dto: CreateClubDto) {
    return unwrapSupabase(
      await this.supabase.db.from('clubs').insert(dto).select().single(),
    );
  }

  async update(id: string, dto: UpdateClubDto) {
    return unwrapSupabase(
      await this.supabase.db.from('clubs').update(dto).eq('id', id).select().single(),
    );
  }

  async remove(id: string) {
    return unwrapSupabase(await this.supabase.db.from('clubs').delete().eq('id', id));
  }
}
