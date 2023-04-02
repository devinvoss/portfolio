import { Component, OnDestroy } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
  template: ''
})
export class DestroyableComponent implements OnDestroy {

  private $isAlive = new Subject<any>();

  constructor() { }

  ngOnDestroy(): void {
    this.$isAlive.next(null);
    this.$isAlive.complete();
  }

  takeUntilDestroyed = <T>(source: Observable<T>): Observable<T> => {
    return source.pipe(
      takeUntil(this.$isAlive)
    )
  }

}
