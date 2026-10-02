import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CookieService } from '../../services';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private cookieService = inject(CookieService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const bearer = 'Bearer ' + this.cookieService.getCookie('access_token');
    request = request.clone({
      setHeaders: {
        'Content-Type' : 'application/json; charset=utf-8',
        'Accept'       : 'application/json',
        'Authorization': bearer
      }
    })
    return next.handle(request);
  }
}
