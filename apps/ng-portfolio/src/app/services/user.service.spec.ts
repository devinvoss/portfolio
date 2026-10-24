import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionUser } from '@portfolio/models';

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;
  const assign = jest.fn();

  const admin: SessionUser = { id: 'a', role: 'admin', displayName: 'Devin' };
  const member: SessionUser = { id: 'm', role: 'member', displayName: 'Sam' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([{ path: 'home', children: [] }]),
        { provide: DOCUMENT, useValue: { location: { assign } } }
      ],
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the session from the API once', async () => {
    const first = firstValueFrom(service.loadSession());
    http.expectOne('api/auth/me').flush({ user: member });
    expect(await first).toEqual(member);

    expect(await firstValueFrom(service.loadSession())).toEqual(member);
    http.expectNone('api/auth/me');
  });

  it('treats a failed session check as signed out', async () => {
    const session = firstValueFrom(service.loadSession());
    http.expectOne('api/auth/me').flush(null, { status: 500, statusText: 'Server Error' });
    expect(await session).toBeNull();
  });

  it('shows navigation for each role', async () => {
    const names = async () => (await firstValueFrom(service.getUserRoutes())).map(route => route.name);

    expect(await names()).toEqual(['Home', 'Movies']);
    service.user$.next(member);
    expect(await names()).toEqual(['Home', 'Movies', 'Account', 'Log Out']);
    service.user$.next(admin);
    expect(await names()).toEqual(['Home', 'Movies', 'Log Out']);
  });

  it('stores the admin after login', async () => {
    const login = firstValueFrom(service.adminLogin('devin', 'secret'));
    const req = http.expectOne('api/auth/admin/login');
    expect(req.request.body).toEqual({ username: 'devin', password: 'secret' });
    req.flush({ user: admin });

    expect(await login).toEqual(admin);
    expect(service.user$.value).toEqual(admin);
  });

  it('clears the user on logout', () => {
    service.user$.next(member);
    service.logout();
    http.expectOne({ method: 'POST', url: 'api/auth/logout' }).flush(null);
    expect(service.user$.value).toBeNull();
  });

  it('sends the browser to the provider with the return path', () => {
    service.signIn('github', '/movie/detail/1');
    expect(assign).toHaveBeenCalledWith('/api/auth/github?returnTo=%2Fmovie%2Fdetail%2F1');
  });
});
