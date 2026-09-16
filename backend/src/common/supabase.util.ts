import { BadRequestException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';

export function unwrapSupabase<T>(
  result: { data: T | null; error: PostgrestError | null },
  fallbackMessage = 'Greška baze podataka',
): T {
  if (result.error) {
    throw new BadRequestException(result.error.message || fallbackMessage);
  }

  return result.data as T;
}
