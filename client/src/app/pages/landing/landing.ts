import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Landing 
{
  private authService = inject(AuthService);

  // Expose signals to template
  readonly hasAccess = this.authService.hasAccess;
  readonly isLoading = this.authService.isLoading;
}
