import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { map, take, filter } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export const AuthGuard: CanActivateFn = () => 
{
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Wait for loading to complete, then check access
  return toObservable(authService.isLoading).pipe(
    filter(isLoading => !isLoading),
    take(1),
    map(() => 
    {
      if (authService.hasAccess()) 
      {
        return true;
      }
      return router.parseUrl('/');
    })
  );
};