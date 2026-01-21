import { Component, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { Button } from '@ui/button/button';
import { BlinkingIndicator } from '@ui/blinking-indicator/blinking-indicator';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gameEnergyArrow } from '@ng-icons/game-icons';
import { AuthService } from '@services/auth';
import { StreamDataService } from '@services/stream-data';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-header',
  imports: [Button, BlinkingIndicator, NgIcon],
  viewProviders: [provideIcons({ gameEnergyArrow })],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class Header 
{
  private authService = inject(AuthService);
  private streamData = inject(StreamDataService);
  private destroyRef = inject(DestroyRef);
  
  readonly isAuthenticated = this.authService.hasAccess;
  readonly liveStatus = this.streamData.status;

  constructor() 
  {
    /**
     * Starts polling immediately and stops automatically on destroy.
     * The header is always visible so it would get cleaned anyways without
     * the need for cleanup but this impacts HMR and for future proofing.
     */
    this.streamData.pollLiveStatus()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe();
  }

  login() 
  {
    this.authService.login();
  }

  logout() 
  {
    this.authService.logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}