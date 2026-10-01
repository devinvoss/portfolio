import { AfterViewInit, Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef} from '@angular/cdk/overlay';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'dvoss-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatIconModule,
    DragDropModule
  ]
})
export class ModalComponent implements AfterViewInit, OnDestroy {

  @ViewChild(TemplateRef) dialogTemplate!: TemplateRef<any>;
  @Input() canDismiss: boolean = true;
  overlayRef!: OverlayRef;
  portal!: TemplatePortal;

  constructor(private overlay: Overlay, private vcr: ViewContainerRef) { }

  ngAfterViewInit(): void {
    this.portal = new TemplatePortal(this.dialogTemplate, this.vcr);
  }

  ngOnDestroy(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
  }

  open(): void {
    if (this.overlayRef && this.overlayRef.hasAttached()) return;

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      hasBackdrop: true,
      minWidth: 200,
      maxWidth: 1000,
      maxHeight: '90%',
      scrollStrategy: this.overlay.scrollStrategies.block()
    });

    if (this.canDismiss) {
      this.overlayRef.backdropClick().subscribe(() => this.overlayRef.detach());
      this.overlayRef.keydownEvents().subscribe((x) => {
        if (x.key === 'Escape') {
          this.overlayRef.detach();
        }
      })
    }

    this.overlayRef.attach(this.portal);
  }

  close(): void {
    if (!this.overlayRef) return;

    this.overlayRef.detach();
    this.overlayRef.dispose();
  }
}
