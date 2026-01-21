import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, switchMap, tap, timer } from 'rxjs';
import { environment } from '@environments/environment';

/**
 * StreamDataService
 * Polls backend for live status and exposes it as Angular signals.
 */
@Injectable({
  providedIn: 'root',
})
export class StreamDataService
{
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  /**
   * Internal signal for live status.
   * undefined = "loading/unknown", true = live, false = offline
   */
  private _liveStatus = signal<boolean | undefined>(undefined);

  /**
   * Read-only signal for consumers.
   */
  readonly status = this._liveStatus.asReadonly();

  /**
   * Starts polling the backend for live status. The default parameter contains
   * an underscore "_" in "60_000" to indicate 60,000ms. It's a valid separator 
   * to make the parameter easier to read and not miss.
   * @param intervalMs Polling interval in milliseconds (default of 60s)
   * @returns Observable you should subscribe to (don't forget to clean up!).
   */
  pollLiveStatus(intervalMs = 60_000) 
  {
    return timer(0, intervalMs).pipe(
      // timer(0, ...) emits immediately, so UI updates on first load.
      switchMap(() => this.http.get<{ isLive: boolean }>(`${this.API_URL}/stream/status`)),
      tap(response => this._liveStatus.set(response.isLive)),
      catchError(error => 
      {
        console.error('Live status check failed:', error);
        
        // Fail-safe: treat as offline on error.
        this._liveStatus.set(false);
        return of({ isLive: false });
      })
    );
  }
}
