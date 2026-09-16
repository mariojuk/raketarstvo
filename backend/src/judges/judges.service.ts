import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateJudgeDto, UpdateJudgeDto } from './dto/judge.dto';

@Injectable()
export class JudgesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    return unwrapSupabase(
      await this.supabase.db
        .from('users')
        .select('id, email, name, club_id, created_at, club:clubs(*)')
        .eq('role', 'judge')
        .order('name'),
    );
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('users')
      .select('id, email, name, club_id, created_at, club:clubs(*)')
      .eq('id', id)
      .eq('role', 'judge')
      .single();

    if (error || !data) {
      throw new NotFoundException('Sudac nije pronađen');
    }

    return data;
  }

  async create(dto: CreateJudgeDto) {
    const password_hash = await bcrypt.hash(dto.password, 10);

    return unwrapSupabase(
      await this.supabase.db
        .from('users')
        .insert({
          name: dto.name,
          email: dto.email.toLowerCase(),
          password_hash,
          role: 'judge',
          club_id: dto.club_id,
        })
        .select('id, email, name, club_id, created_at, club:clubs(*)')
        .single(),
    );
  }

  async update(id: string, dto: UpdateJudgeDto) {
    const update: Record<string, unknown> = {};

    if (dto.name) update.name = dto.name;
    if (dto.email) update.email = dto.email.toLowerCase();
    if (dto.club_id) update.club_id = dto.club_id;
    if (dto.password) update.password_hash = await bcrypt.hash(dto.password, 10);

    return unwrapSupabase(
      await this.supabase.db
        .from('users')
        .update(update)
        .eq('id', id)
        .eq('role', 'judge')
        .select('id, email, name, club_id, created_at, club:clubs(*)')
        .single(),
    );
  }

  async remove(id: string) {
    return unwrapSupabase(
      await this.supabase.db.from('users').delete().eq('id', id).eq('role', 'judge'),
    );
  }
}
