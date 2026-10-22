import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, map, of, shareReplay, tap } from 'rxjs';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { SessionResponse, SessionUser, SsoProvider } from '@portfolio/models';

import { INavigation, NavigationType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private document = inject(DOCUMENT);

  readonly unauthenticatedRoutes = <INavigation[]>[
    {
      route: 'home',
      type: NavigationType.Internal,
      name: 'Home'
    },
    {
      route: 'movie',
      type: NavigationType.Internal,
      name: 'Movies'
    }
  ];

  readonly memberRoutes = <INavigation[]>[
    ...this.unauthenticatedRoutes,
    {
      route: 'account',
      type: NavigationType.Internal,
      name: 'Account'
    },
    {
      name: 'Log Out',
      type: NavigationType.Action,
      action: () => {
        this.logout();
      }
    }
  ];

  readonly adminRoutes = <INavigation[]>[
    {
      route: 'home',
      type: NavigationType.Internal,
      name: 'Home'
    },
    {
      type: NavigationType.Menu,
      name: 'Movies',
      items: [
        {
          route: 'movie',
          type: NavigationType.Internal,
          name: 'Search'
        },
        {
          route: 'movie/add',
          type: NavigationType.Internal,
          name: 'Add Movie'
        }
      ]
    },
    {
      name: 'Log Out',
      type: NavigationType.Action,
      action: () => {
        this.logout();
      }
    }
  ]

  user$: BehaviorSubject<SessionUser | null> = new BehaviorSubject<SessionUser | null>(null);
  isAdmin$ = this.user$.pipe(map(user => user?.role === 'admin'));

  // The session lives in an HttpOnly cookie the app can't read, so ask the API who is signed in.
  private session$ = this.http.get<SessionResponse>('api/auth/me').pipe(
    map(res => res.user),
    catchError(() => of(null)),
    tap(user => this.user$.next(user)),
    shareReplay(1)
  );

  /** Emits the signed-in user once the session has been checked with the API. */
  loadSession(): Observable<SessionUser | null> {
    return this.session$.pipe(map(() => this.user$.value));
  }

  getUserRoutes(): Observable<INavigation[]> {
    return this.user$.pipe(
      map(user => {
        if (!user) {
          return [...this.unauthenticatedRoutes];
        }
        return user.role === 'admin' ? [...this.adminRoutes] : [...this.memberRoutes];
      })
    );
  }

  getProviders(): Observable<SsoProvider[]> {
    return this.http.get<{ providers: SsoProvider[] }>('api/auth/providers').pipe(
      map(res => res.providers),
      catchError(() => of([]))
    );
  }

  /** Leaves the app for the provider's sign-in page; the API sends the browser back to returnTo afterwards. */
  signIn(provider: SsoProvider, returnTo = '/') {
    this.document.location.assign(`/api/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  adminLogin(username: string, password: string): Observable<SessionUser | null> {
    return this.http.post<SessionResponse>('api/auth/admin/login', { username, password }).pipe(
      map(res => res.user),
      tap(user => this.user$.next(user))
    );
  }

  updateDisplayName(displayName: string): Observable<SessionUser> {
    return this.http.patch<SessionUser>('api/account/me', { displayName }).pipe(
      tap(user => this.user$.next(user))
    );
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>('api/account/me').pipe(
      tap(() => this.user$.next(null))
    );
  }

  logout() {
    this.http.post<void>('api/auth/logout', {}).subscribe({
      complete: () => {
        this.user$.next(null);
        this.router.navigate(['home']);
      }
    });
  }

}
