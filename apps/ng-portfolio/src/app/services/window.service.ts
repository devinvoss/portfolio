import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, Observable, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WindowService {

  constructor(private breakpointObserver: BreakpointObserver) { }

  isPhoneOrTablet$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.XSmall, Breakpoints.Small]).pipe(
    map(result => result.matches),
    shareReplay()
  )

  isPhone$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.XSmall]).pipe(
    map(result => result.matches),
    shareReplay()
  )
}
