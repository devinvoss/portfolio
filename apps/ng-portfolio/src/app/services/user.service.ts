import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, map } from 'rxjs';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import jwt_decode from 'jwt-decode';

import { INavigation, LoginResponse, NavigationType, User } from '../models';
import { CookieService } from './cookie.service';
import { Constants } from '@app/shared/common/constants';

@Injectable({
  providedIn: 'root'
})
export class UserService {

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

  readonly authenticatedRoutes = <INavigation[]>[
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

  readonly userKey: string = 'dv-user';

  private _userInfo: User | null = null;
  get userInfo(): User | null {
    if (!this._userInfo) {
      this.loadUserInfo();
    }
    return this._userInfo;
  }
  set userInfo(user: User | null) {
    this._userInfo = user;
    this.user$.next(this._userInfo);
  }

  user$: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  constructor(private router: Router,
    private http: HttpClient,
    private cookieService: CookieService
  ) { }

  getUserRoutes(): Observable<INavigation[]> {
    return this.user$.pipe(
      map(user => {
        return user ? [...this.authenticatedRoutes] : [...this.unauthenticatedRoutes];
      })
    );
  }

  loadUserInfo() {
    const token = this.cookieService.getCookie(Constants.ACCESS_TOKEN);
    if (token) {
      this.userInfo = <User>jwt_decode(token);
    }
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>('api/auth/login', { username, password }).pipe(
      map((res: LoginResponse) => {
        this.cookieService.setCookie(Constants.ACCESS_TOKEN, res.access_token, 1);
        this.userInfo = <User>jwt_decode(res.access_token);
        return this.userInfo;
      })
    );
  }

  logout() {
    this.cookieService.deleteCookie(Constants.ACCESS_TOKEN);
    this.userInfo = null;
    this.router.navigate(['login']);
  }

}
