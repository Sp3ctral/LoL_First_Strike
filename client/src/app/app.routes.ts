import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'calculator',
    loadComponent: () => import('@pages/calculator/calculator').then(m => m.Calculator)
  },
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