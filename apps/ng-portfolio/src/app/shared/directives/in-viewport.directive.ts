import { Directive, ElementRef, OnDestroy, OnInit, inject, output } from '@angular/core';

// Emits whenever the host element scrolls into or out of view
@Directive({
  selector: '[dvossInViewport]'
})
export class InViewportDirective implements OnInit, OnDestroy {
  private element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  // Start before the element is actually on screen so content is ready by the time it's reached
  readonly rootMargin = '400px';
  inViewport = output<boolean>({ alias: 'dvossInViewport' });

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.observer = new IntersectionObserver(
      ([entry]) => this.inViewport.emit(entry.isIntersecting),
      { rootMargin: this.rootMargin }
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
