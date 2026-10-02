import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DestroyableComponent implements OnDestroy {

  private $isAlive = new Subject<void>();


  ngOnDestroy(): void {
    this.$isAlive.next();
    this.$isAlive.complete();
  }

  takeUntilDestroyed = <T>(source: Observable<T>): Observable<T> => {
    return source.pipe(
      takeUntil(this.$isAlive)
    )
  }

}
