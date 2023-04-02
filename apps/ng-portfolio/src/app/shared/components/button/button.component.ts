import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { MatProgressSpinnerModule  } from '@angular/material/progress-spinner';

@Component({
  selector: 'dvoss-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class ButtonComponent {

  @Input() loading: boolean = false;
  @Input() type: string = 'button';
  @Input() class: string = 'dv-button';
  @Input() disabled: boolean = false;

  constructor() { }

}
