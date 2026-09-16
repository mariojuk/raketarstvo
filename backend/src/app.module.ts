import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { CompetitionTeamsModule } from './competition-teams/competition-teams.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { CompetitorsModule } from './competitors/competitors.module';
import { JudgeAssignmentsModule } from './judge-assignments/judge-assignments.module';
import { JudgesModule } from './judges/judges.module';
import { LaunchesModule } from './launches/launches.module';
import { RankingsModule } from './rankings/rankings.module';
import { SupabaseModule } from './supabase/supabase.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    ClubsModule,
    CompetitorsModule,
    JudgesModule,
    CompetitionsModule,
    CompetitionTeamsModule,
    TeamsModule,
    LaunchesModule,
    JudgeAssignmentsModule,
    RankingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
