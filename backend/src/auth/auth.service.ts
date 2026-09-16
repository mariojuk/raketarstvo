import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from '../common/types';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const { data: user, error } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('email', dto.email.toLowerCase())
      .single<User>();

    if (error || !user) {
      throw new UnauthorizedException('Neispravan email ili lozinka');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);

    if (!valid) {
      throw new UnauthorizedException('Neispravan email ili lozinka');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        club_id: user.club_id,
      },
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    const { data } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single<User>();

    return data ?? null;
  }
}
