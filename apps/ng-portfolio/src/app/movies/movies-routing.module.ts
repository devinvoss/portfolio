import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailComponent } from './detail/detail.component';
import { EditorComponent } from './editor/editor.component';
import { SearchComponent } from './search/search.component';
import { adminGuard } from '@app/core/guards';

const routes: Routes = [
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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MoviesRoutingModule { }
