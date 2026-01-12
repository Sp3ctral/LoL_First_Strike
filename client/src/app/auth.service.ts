import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);

  // Signal to track subscription status. 
  // undefined = unknown/loading, true = subscribed, false = not subscribed
  isSubscribed = signal<boolean | undefined>(undefined);
  
  // Computed signal for easy access checks in templates/guards
  hasAccess = computed(() => this.isSubscribed() === true);

  constructor() {
    // Restore session from localStorage so refresh doesn't log user out immediately
    const storedSub = localStorage.getItem('isSubscribed');
    if (storedSub === 'true') {
      this.isSubscribed.set(true);
    }
  }

  // 1. Start Login: Redirect to backend
  login() {
    window.location.href = 'http://localhost:3000/auth/twitch';
  }

  // 2. Handle Return: Process the status query param
  handleAuthCallback(status: string) {
    if (status === 'subscribed') {
      this.isSubscribed.set(true);
      localStorage.setItem('isSubscribed', 'true');
      // Navigate to the protected dashboard
      this.router.navigate(['/dashboard']);
    } else {
      this.isSubscribed.set(false);
      localStorage.removeItem('isSubscribed');
      alert('You must be subscribed to access this content!');
      this.router.navigate(['/']); 
    }
  }

  logout() {
    this.isSubscribed.set(false);
    localStorage.removeItem('isSubscribed');
    this.router.navigate(['/']);
  }
}