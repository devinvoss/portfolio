import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { DestroyableComponent, HeaderComponent, NavComponent, NavItemComponent, ToastComponent } from './components';
import { ButtonComponent } from '../shared/components';


@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    ButtonComponent,
    DestroyableComponent,
    HeaderComponent,
    NavComponent,
    NavItemComponent,
    ToastComponent
  ],
  exports: [
    DestroyableComponent,
    HeaderComponent,
    NavComponent,
    ToastComponent
  ]
})
export class CoreModule { }
