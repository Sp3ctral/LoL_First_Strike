import { Component, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { Button } from '@ui/button/button';
import { BlinkingIndicator } from '@ui/blinking-indicator/blinking-indicator';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gameEnergyArrow } from '@ng-icons/game-icons';
import { AuthService } from '@services/auth.service';
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
  private destroyRef = inject(DestroyRef);
  
  readonly isAuthenticated = this.authService.hasAccess;
  readonly isVerifying = this.authService.isLoading;

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