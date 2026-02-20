import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, pipe, switchMap, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class ChampionDataService
{
  private http = inject(HttpClient);

    readonly championData = toSignal(
      this.http.get('https://ddragon.leagueoflegends.com/api/versions.json').pipe(

      // IN: JSON of LoL API versions
      // OUT: Latest LoL API version
      map((versions: any) => versions[0]),

      // IN: Latest LoL API version
      //OUT: JSON of all LoL champions and their stats
      switchMap((latestVersion) => 
        {
          return this.http.get<any>(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`).pipe(map((champions) => champions['data']));
        })
      ), 
      {initialValue: undefined});
  }
