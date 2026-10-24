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
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule)
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
    loadChildren: () => import('./movies/movies.module').then(m => m.MoviesModule)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
