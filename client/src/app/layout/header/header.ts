import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Button } from '@ui/button/button';
import { BlinkingIndicator } from '@ui/blinking-indicator/blinking-indicator';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gameEnergyArrow } from '@ng-icons/game-icons';
import { AuthService } from '@services/auth.service';

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
  
  readonly isAuthenticated = this.authService.hasAccess;
  readonly isVerifying = this.authService.isLoading;

  login() 
  {
    this.authService.login();
  }

  logout() 
  {
    this.authService.logout().subscribe();
  }
}