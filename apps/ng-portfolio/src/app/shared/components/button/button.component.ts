import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinnerModule  } from '@angular/material/progress-spinner';

@Component({
  selector: 'dvoss-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class ButtonComponent {

  @Input() loading = false;
  @Input() type = 'button';
  @Input() class = 'dv-button';
  @Input() disabled = false;


}
