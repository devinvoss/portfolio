import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinnerModule  } from '@angular/material/progress-spinner';

@Component({
  selector: 'dvoss-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class ButtonComponent {

  @Input() loading: boolean = false;
  @Input() type: string = 'button';
  @Input() class: string = 'dv-button';
  @Input() disabled: boolean = false;

  constructor() { }

}
