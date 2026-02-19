import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, switchMap, tap } from 'rxjs';

interface ChampionApiResponse 
{
  data: Record<string, ChampionApiEntry>;
}

interface ChampionApiEntry 
{
  id: string;
  key: string;
  name: string;
  image: {
    full: string;
  };
}

export interface ChampionOption 
{
  id: string;
  key: string;
  name: string;
  iconUrl: string;
}

@Injectable({
  providedIn: 'root',
})

export class ChampionDataService 
{
  private http = inject(HttpClient);

  private readonly _champions = signal<ChampionOption[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | undefined>(undefined);
  private hasLoaded = false;

  readonly champions = computed(() => this._champions());
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  loadChampions(): void 
  {
    if (this.hasLoaded || this._loading()) 
    {
      return;
    }

    this._loading.set(true);
    this._error.set(undefined);

    this.http
      .get<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
      .pipe(
        map(versions => versions[0]),
        switchMap(version =>
          this.http.get<ChampionApiResponse>(
            `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
          ).pipe(map(response => ({ response, version })))
        ),
        map(({ response, version }) =>
          Object.values(response.data)
            .map(champion => ({
              id: champion.id,
              key: champion.key,
              name: champion.name,
              iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.image.full}`,
            }))
            .sort((firstChampion, secondChampion) => firstChampion.name.localeCompare(secondChampion.name))
        ),
        tap(champions => {
          this._champions.set(champions);
          this.hasLoaded = true;
        }),
        catchError(error => {
          console.error('Champion list request failed:', error);
          this._error.set('Unable to load champions right now. Please try again.');
          return of([] as ChampionOption[]);
        }),
        tap(() => this._loading.set(false))
      ).subscribe();
  }
}
