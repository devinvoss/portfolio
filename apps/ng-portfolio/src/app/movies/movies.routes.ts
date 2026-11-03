import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { environment } from '@env';
import { ImagekitioAngularModule } from 'imagekitio-angular';
import { adminGuard, signedInGuard } from '@app/core/guards';
import { MovieListKind } from './movie-list-kind';
import { DetailComponent } from './detail/detail.component';
import { EditorComponent } from './editor/editor.component';
import { SearchComponent } from './search/search.component';

// Configures ImageKit for the movie list's <ik-image> posters
const imageKitProviders = [
  importProvidersFrom(ImagekitioAngularModule.forRoot({
    publicKey: environment.ik_publicKey,
    urlEndpoint: environment.ik_urlEndpoint
  }))
];

const watched = { kind: MovieListKind.Watched };
const recommended = { kind: MovieListKind.Recommended };

export const MOVIE_ROUTES: Routes = [
  {
    path: '',
    providers: imageKitProviders,
    data: watched,
    children: [
      {
        path: '',
        component: SearchComponent
      },
      {
        path: 'add',
        canActivate: [adminGuard],
        component: EditorComponent
      },
      {
        path: 'edit/:id',
        canActivate: [adminGuard],
        component: EditorComponent
      },
      {
        path: 'detail/:id',
        component: DetailComponent
      }
    ]
  }
];

export const RECOMMENDATION_ROUTES: Routes = [
  {
    path: '',
    providers: imageKitProviders,
    data: recommended,
    children: [
      {
        path: '',
        component: SearchComponent
      },
      {
        // Same page the admin adds movies with, minus the rating
        path: 'add',
        canActivate: [signedInGuard],
        component: EditorComponent
      },
      {
        path: ':id',
        component: DetailComponent
      }
    ]
  }
];
