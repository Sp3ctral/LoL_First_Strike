import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { Champion, ChampionDataError, ChampionResponse, ChampionState } from '@models/champion.model';

@Injectable({
  providedIn: 'root'
})
export class ChampionDataService
{
  private http = inject(HttpClient);
  
  private _version: string | undefined = undefined;

  public readonly state = signal<ChampionState>(
  {
    data: [],
    error: undefined,
    loading: true
  });

  public get version()
  {
    return this._version;
  }

  constructor()
  {
    this.http.get<string[]>('https://ddragon.leagueoflegends.com/api/versions.json').pipe(

      // IN: JSON of LoL API versions
      // OUT: Latest LoL API version
      map((response) => response[0]),

      // Side effect: Set the version so we can use it in other requests like for items...
      tap((version) => this._version = version),

      // IN: Latest LoL API version
      // OUT: JSON of all LoL champions and their stats
      switchMap((latestVersion) => 
      {
        return this.http.get<ChampionResponse>(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`).pipe(

          // IN: Dictionary from Riot API of champion names and with their values being champion info
          // OUT: ARRAY of Champion objects
          map((response) => Object.values(response.data)),
          catchError(() => 
          {
            // In the event of an error, just spread the current state and adjust the error
            this.state.update(current => ({ ...current, error: ChampionDataError.ChampionFetch }));
            
            // CatchError requires a return of an observable so we return an empty array observable
            return of([] as Champion[])
          })
        );
      }),
      catchError(() => 
      {
        // In the event of an error, just spread the current state and adjust the error
        this.state.update(current => ({ ...current, error: ChampionDataError.VersionFetch }));
        
        // CatchError requires a return of an observable so we return an empty array observable
        return of([] as Champion[])
      }),

      // The last step is to spread the current state and update it to disable loading state 
      finalize(() => this.state.update(current => ({ ...current, loading: false })))
    ).subscribe((data) => 
    {
      /**
       * subscribe() fires all the requests
       * If we don't get an empty array back then the chain of operations succeeded and we need to 
       * ensure that the data that was passed all the way through the pipe is saved in the state 
       * signal. If we get back an empty array then one of the catchError calls set it.
       */
      if (data.length)
      {
        this.state.update(current => ({ ...current, data, error: undefined }));
      }
    })
  }
}
