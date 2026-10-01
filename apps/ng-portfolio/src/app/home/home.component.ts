import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { fadeInAnimation } from '@app/shared/animations';

@Component({
  selector: 'dvoss-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    fadeInAnimation()
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class HomeComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {

  }

}
