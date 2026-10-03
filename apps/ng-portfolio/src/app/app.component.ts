import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, withLatestFrom } from 'rxjs';
import { HeaderComponent, NavComponent, ToastComponent } from './core/components';
import { UserService, WindowService } from './services';
import { MatSidenavContainer, MatSidenav, MatSidenavContent } from '@angular/material/sidenav';

@Component({
  selector: 'portfolio-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [HeaderComponent, NavComponent, ToastComponent, MatSidenavContainer, MatSidenav, MatSidenavContent, RouterOutlet]
})
export class AppComponent implements OnInit {
  private windowService = inject(WindowService);
  private router = inject(Router);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  readonly sideNavKey: string = 'dvoss-side-nav';

  sideNavMode = signal<'side' | 'over'>('side');
  sideNavIsOpen = signal(true);

  navigationEnd$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    takeUntilDestroyed()
  );

  ngOnInit(): void {
    this.windowService.isPhoneOrTablet$.pipe(
      map(result => result ? 'over' : 'side'),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(mode => this.sideNavMode.set(mode));

    // If a user navigates on mobile, close the side menu
    this.navigationEnd$.pipe(
      withLatestFrom(this.windowService.isPhone$),
      map(([, isPhone]) => isPhone),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(isPhone => {
      if (isPhone && this.sideNavIsOpen()) {
        this.toggleSideNav();
      }
    });

    this.loadSideNavFromLocalStorage();
    this.userService.loadUserInfo();
  }

  toggleSideNav() {
    this.sideNavIsOpen.update(isOpen => !isOpen);
    localStorage.setItem(this.sideNavKey, this.sideNavIsOpen().toString());
  }

  loadSideNavFromLocalStorage() {
    const value = localStorage.getItem(this.sideNavKey);
    if (!value) return;
    this.sideNavIsOpen.set(value === 'true');
  }
}
