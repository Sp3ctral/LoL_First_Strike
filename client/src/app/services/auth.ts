import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { tap, catchError, of, switchMap } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
/**
 * AuthService
 * Handles auth redirects, session checks, token refresh, and logout state.
 */
export class AuthService 
{
    private router = inject(Router);
    private http = inject(HttpClient);
    
    // Signal starts as undefined to represent "unknown/loading"
    private _isSubscribed = signal<boolean | undefined>(undefined);
    
    // Expose read-only computed signals for UI state
    readonly hasAccess = computed(() => this._isSubscribed() === true);
    readonly isLoading = computed(() => this._isSubscribed() === undefined);
    
    // Centralized API base URL
    private readonly API_URL = environment.apiUrl;
    
    /**
     * Redirects the user to the Twitch OAuth flow.
     */
    login() 
    {
        // Full page redirect is required for OAuth
        window.location.href = `${this.API_URL}/auth/twitch`;
    }
    
    /**
     * Checks the current session and updates subscription state.
     * Falls back to refresh if the session is unauthorized.
     */
    checkSession() 
    {
        return this.http.get<{ subscribed: boolean }>(
            `${this.API_URL}/auth/session`,
            { withCredentials: true }
        ).pipe(
            // Update signal based on server response
            tap(response => this._isSubscribed.set(response.subscribed)),
            catchError(error => 
            {
                // If the session is expired, attempt a refresh
                if (error instanceof HttpErrorResponse && error.status === 401)
                {
                    return this.refreshSession();
                }
                console.error('Session check failed:', error);
                this._isSubscribed.set(false);
                return of({ subscribed: false });
            })
        );
    }

    /**
     * Refreshes the session token.
     * Kept private to ensure checkSession remains the public entry point.
     */
    private refreshSession() 
    {
        return this.http.post<{ subscribed: boolean }>(
            `${this.API_URL}/auth/refresh`,
            {},
            { withCredentials: true }
        ).pipe(
            // Update signal after refresh attempt
            tap(response => this._isSubscribed.set(response.subscribed)),
            catchError(error => 
            {
                console.error('Token refresh failed:', error);
                this._isSubscribed.set(false);
                return of({ subscribed: false });
            })
        );
    }

    /**
     * Logs out the user and clears local auth state.
     */
    logout() 
    {
        return this.http.post<void>(
            `${this.API_URL}/auth/logout`,
            {},
            { withCredentials: true }
        ).pipe(
            tap(() => 
            {
                // Reset state and return to home
                this._isSubscribed.set(false);
                this.router.navigate(['/']);
            }),
            catchError(error => 
            {
                console.error('Logout failed:', error);
                this._isSubscribed.set(false);
                this.router.navigate(['/']);
                return of(void 0);
            })
        );
    }
}

