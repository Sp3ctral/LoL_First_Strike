import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService 
{
    private router = inject(Router);
    private http = inject(HttpClient);
    
    private _isSubscribed = signal<boolean | undefined>(undefined);
    
    // Expose as readonly
    readonly hasAccess = computed(() => this._isSubscribed() === true);
    readonly isLoading = computed(() => this._isSubscribed() === undefined);
    
    private readonly API_URL = environment.apiUrl;
    
    login() 
    {
        window.location.href = `${this.API_URL}/auth/twitch`;
    }
    
    checkSession() 
    {
        return this.http.get<{ subscribed: boolean }>(
            `${this.API_URL}/auth/session`,
            { withCredentials: true }
        ).pipe(
            tap(response => this._isSubscribed.set(response.subscribed)),
            catchError(error => {
                console.error('Session check failed:', error);
                this._isSubscribed.set(false);
                return of({ subscribed: false });
            })
        );
    }

    logout() 
    {
        return this.http.post(
            `${this.API_URL}/auth/logout`,
            {},
            { withCredentials: true }
        ).pipe(
            tap(() => {
                this._isSubscribed.set(false);
                this.router.navigate(['/']);
            }),
            catchError(error => {
                console.error('Logout failed:', error);
                this._isSubscribed.set(false);
                this.router.navigate(['/']);
                return of(null);
            })
        );
    }
}

