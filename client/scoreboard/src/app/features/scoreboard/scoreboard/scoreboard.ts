import { Component, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../../core/api';
import { RealtimeService } from '../../../core/realtime';
import { TeamPanelComponent } from '../../../shared/team-panel/team-panel';
import { TimerComponent } from '../../../shared/timer/timer';
import { QuarterIndicatorComponent } from '../../../shared/quarter-indicator/quarter-indicator';
import { FoulsPanelComponent } from '../../../shared/fouls-panel/fouls-panel';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [RouterLink, MatButtonModule, TeamPanelComponent, TimerComponent, QuarterIndicatorComponent, FoulsPanelComponent],
  templateUrl: './scoreboard.html',
  styleUrls: ['./scoreboard.scss']
})
export class ScoreboardComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  public realtime = inject(RealtimeService);

  matchId = computed(() => Number(this.route.snapshot.paramMap.get('id') ?? '1'));
  homeName = 'A TEAM';
  awayName = 'B TEAM';

  constructor() {
    // Debug SOLO en navegador (no en SSR)
    if (isPlatformBrowser(this.platformId)) {
      effect(() => console.debug('[SB] quarter signal =', this.realtime.quarter()));
    }
  }


  async ngOnInit() {
    const id = this.matchId();

    // Snapshot inicial (incluye quarter)
    this.api.getMatch(id).subscribe({
      next: (m: any) => {
        this.realtime.score.set({ home: m.homeScore ?? 0, away: m.awayScore ?? 0 });
        this.homeName = m.homeTeam || 'A TEAM';
        this.awayName = m.awayTeam || 'B TEAM';

        if (typeof m.quarter === 'number') this.realtime.quarter.set(m.quarter);
        if (m.timer) this.realtime.hydrateTimerFromSnapshot({ ...m.timer, quarter: m.quarter });
      },
      error: (e) => console.error('[SB] getMatch error', e)
    });

    // Conexión SignalR (en cliente)
    if (isPlatformBrowser(this.platformId)) {
      await this.realtime.connect(id);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.realtime.disconnect();
    }
  }
}
