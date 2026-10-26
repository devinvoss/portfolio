import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { environment } from '@env';
import { ImagekitioAngularModule } from 'imagekitio-angular';
import { adminGuard } from '@app/core/guards';
import { DetailComponent } from './detail/detail.component';
import { EditorComponent } from './editor/editor.component';
import { SearchComponent } from './search/search.component';

export const MOVIE_ROUTES: Routes = [
  {
    path: '',
    // Configures ImageKit for the movie list's <ik-image> posters
    providers: [
      importProvidersFrom(ImagekitioAngularModule.forRoot({
        publicKey: environment.ik_publicKey,
        urlEndpoint: environment.ik_urlEndpoint
      }))
    ],
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
