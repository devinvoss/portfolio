import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';

@NgModule({
  imports: [
    CommonModule,
    HomeComponent
  ],
  exports: [
    HomeComponent
  ]
})
export class HomeModule { }
