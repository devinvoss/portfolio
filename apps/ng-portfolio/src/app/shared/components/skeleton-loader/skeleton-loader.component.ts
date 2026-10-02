import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'dvoss-skeleton-loader',
  standalone: true,
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonLoaderComponent {

  /** Options: 'card' | 'text' | 'paragraph' | 'profile'. Defaults to 'card'. */
  @Input() type: 'card' | 'text' | 'paragraph' | 'profile' = 'card';


}
