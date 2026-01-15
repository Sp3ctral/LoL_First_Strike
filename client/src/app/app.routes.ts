import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'error',
    loadComponent: () => import('@pages/error/error').then(m => m.Error)
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('@pages/landing/landing').then(m => m.Landing)
  },
  {
    path: '**',
    redirectTo: ''
  }
];