import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { SessionUser } from '@portfolio/models';
import { UserService } from '@app/services';

import { adminGuard, memberGuard } from './auth.guards';

describe('auth guards', () => {
  let user: SessionUser | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: { loadSession: () => of(user) } }
      ]
    });
  });

  async function run(guard: typeof adminGuard): Promise<string | boolean> {
    const state = { url: '/account' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, state)) as Observable<boolean | UrlTree>;
    const value = await firstValueFrom(result);
    return value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value;
  }

  it('adminGuard only allows the admin', async () => {
    user = { id: 'a', role: 'admin', displayName: 'Devin' };
    expect(await run(adminGuard)).toBe(true);
    user = { id: 'm', role: 'member', displayName: 'Sam' };
    expect(await run(adminGuard)).toBe('/admin/login');
  });

  it('memberGuard sends signed-out visitors to sign in and back', async () => {
    user = null;
    expect(await run(memberGuard)).toBe('/login?returnTo=%2Faccount');
  });

  it('memberGuard allows members and sends the admin home', async () => {
    user = { id: 'm', role: 'member', displayName: 'Sam' };
    expect(await run(memberGuard)).toBe(true);
    user = { id: 'a', role: 'admin', displayName: 'Devin' };
    expect(await run(memberGuard)).toBe('/home');
  });
});
