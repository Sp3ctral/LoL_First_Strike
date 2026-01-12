import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { Header } from '@layout/header/header';
import { Footer } from '@layout/footer/footer';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit
{
  // Inject services
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  // Local signal for loading state
  isVerifying = signal(false);

  ngOnInit() {
    // Check URL for ?status=subscribed returned from backend
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) {
      this.isVerifying.set(true);
      this.authService.handleAuthCallback(status);
      this.isVerifying.set(false);
    }
  }
}
