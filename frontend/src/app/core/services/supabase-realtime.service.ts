import { Injectable } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Competition, Launch } from '../models';

@Injectable({ providedIn: 'root' })
export class SupabaseRealtimeService {
  private readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  subscribeToLaunches(
    teamIds: string[],
    onChange: (launch: Launch) => void,
  ): RealtimeChannel {
    const channel = this.client.channel(`launches-teams-${teamIds.join('-')}`);

    for (const teamId of teamIds) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'launches',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (payload.new) {
            onChange(payload.new as Launch);
          }
        },
      );
    }

    return channel.subscribe();
  }

  subscribeToCompetition(
    competitionId: string,
    onChange: (competition: Competition) => void,
  ): RealtimeChannel {
    return this.client
      .channel(`competition-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competitions',
          filter: `id=eq.${competitionId}`,
        },
        (payload) => {
          if (payload.new) {
            onChange(payload.new as Competition);
          }
        },
      )
      .subscribe();
  }

  unsubscribe(channel: RealtimeChannel): void {
    void this.client.removeChannel(channel);
  }
}
