import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideStore, withNgxsNoopExecutionStrategy } from '@ngxs/store';
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin';
import { environment } from '@env';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { httpInterceptorProviders } from './app/core/interceptors';
import { MovieState } from './app/store/state/movie.state';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideStore(
      [MovieState],
      { developmentMode: !environment.production },
      withNgxsStoragePlugin({ keys: '*' }),
      withNgxsNoopExecutionStrategy()
    ),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    httpInterceptorProviders
  ]
}).catch((err) => console.error(err));
