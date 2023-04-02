import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MoviesRoutingModule } from './movies-routing.module';
import { DetailComponent } from './detail/detail.component';
import { SearchComponent } from './search/search.component';
import { MovieListItemComponent } from '@app/shared/components/movie-list-item/movie-list-item.component';
import {
  ButtonComponent,
  SkeletonLoaderComponent,
} from '@app/shared/components';
import { MinutesPipe } from '@app/shared/pipes';

import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EditorComponent } from './editor/editor.component';
import { MatIconModule } from '@angular/material/icon';
import { ImagekitioAngularModule } from 'imagekitio-angular';
import { environment } from '../../environments/environment';

@NgModule({
  declarations: [DetailComponent, SearchComponent, EditorComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MoviesRoutingModule,
    MovieListItemComponent,
    SkeletonLoaderComponent,
    MinutesPipe,
    ButtonComponent,
    MatChipsModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    ImagekitioAngularModule.forRoot({
      publicKey: environment.ik_publicKey,
      urlEndpoint: environment.ik_urlEndpoint
    })
  ],
})
export class MoviesModule {}
