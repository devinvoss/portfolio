import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserService } from '@app/services';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(UserService).loadSession().pipe(
    map(user => user?.role === 'admin' ? true : router.createUrlTree(['/admin/login']))
  );
};

export const memberGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(UserService).loadSession().pipe(
    map(user => {
      if (user?.role === 'member') {
        return true;
      }
      return user ? router.createUrlTree(['/home']) : router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
    })
  );
};
