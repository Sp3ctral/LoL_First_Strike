import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class AuthService 
{
    private router = inject(Router);
    private http = inject(HttpClient);
    
    // Signal to track subscription status. 
    // undefined = unknown/loading, true = subscribed, false = not subscribed
    isSubscribed = signal<boolean | undefined>(undefined);
    
    // Computed signal for easy access checks in templates/guards
    hasAccess = computed(() => this.isSubscribed() === true);
    
    // 1. Start Login: Redirect to backend
    login() 
    {
        window.location.href = 'http://localhost:3000/auth/twitch';
    }
    
    // 2. Check Session: Call backend to see if cookie exists
    checkSession() 
    {
        // withCredentials: because true is REQUIRED to send/receive cookies
        return this.http.get<{ subscribed: boolean }>('http://localhost:3000/auth/session', 
            { withCredentials: true });
    }

    logout() 
    {
        this.http.post('http://localhost:3000/auth/logout', {}, { withCredentials: true }).subscribe(
        {
            next: () => 
            {
                this.isSubscribed.set(false);
                this.router.navigate(['/']);
            },
            error: () => 
            {
                this.isSubscribed.set(false);
            }
        });
    }
}

