import { Component, Input } from '@angular/core';

@Component({
  selector: 'dvoss-skeleton-loader',
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.scss']
})
export class SkeletonLoaderComponent {

  /** Options: 'card' | 'text' | 'paragraph' | 'profile'. Defaults to 'card'. */
  @Input() type: 'card' | 'text' | 'paragraph' | 'profile' = 'card';


}
