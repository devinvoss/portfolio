import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MatIcon } from '@angular/material/icon';

export interface PosterViewerData {
  imageUrl: string;
  title: string;
}

// The movie poster at full page size. Opened with the CDK Dialog, which closes it on
// Escape, keeps focus inside it and gives focus back to the poster afterwards.
@Component({
  selector: 'portfolio-poster-viewer',
  templateUrl: './poster-viewer.component.html',
  styleUrls: ['./poster-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class PosterViewerComponent {
  data = inject<PosterViewerData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef);

  close() {
    this.dialogRef.close();
  }
}
