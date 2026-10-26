import { Routes } from '@angular/router';
import { memberGuard } from './core/guards';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'account',
    canActivate: [memberGuard],
    loadComponent: () => import('./account/account.component').then(m => m.AccountComponent)
  },
  {
    path: 'movie',
    loadChildren: () => import('./movies/movies.routes').then(m => m.MOVIE_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
