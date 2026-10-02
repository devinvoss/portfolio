import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, withLatestFrom } from 'rxjs';
import { DestroyableComponent, HeaderComponent, NavComponent, ToastComponent } from './core/components';
import { UserService, WindowService } from './services';
import { MatSidenavContainer, MatSidenav, MatSidenavContent } from '@angular/material/sidenav';

@Component({
  selector: 'portfolio-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HeaderComponent, NavComponent, ToastComponent, MatSidenavContainer, MatSidenav, MatSidenavContent, RouterOutlet]
})
export class AppComponent extends DestroyableComponent implements OnInit {
  private windowService = inject(WindowService);
  private router = inject(Router);
  private userService = inject(UserService);

  readonly sideNavKey: string = 'dvoss-side-nav';

  sideNavMode: 'side' | 'over' = 'side';
  sideNavIsOpen = true;

  navigationEnd$ = this.router.events.pipe(
    this.takeUntilDestroyed,
    filter((e): e is NavigationEnd => e instanceof NavigationEnd)
  );

  ngOnInit(): void {
    this.windowService.isPhoneOrTablet$.pipe(
      this.takeUntilDestroyed,
      map(result => result ? 'over' : 'side')
    ).subscribe(mode => this.sideNavMode = mode);

    // If a user navigates on mobile, close the side menu
    this.navigationEnd$.pipe(
      withLatestFrom(this.windowService.isPhone$),
      map(([, isPhone]) => isPhone)
    ).subscribe(isPhone => {
      if (isPhone && this.sideNavIsOpen) {
        this.toggleSideNav();
      }
    });

    this.loadSideNavFromLocalStorage();
    this.userService.loadUserInfo();
  }

  toggleSideNav() {
    this.sideNavIsOpen = !this.sideNavIsOpen;
    localStorage.setItem(this.sideNavKey, this.sideNavIsOpen.toString());
  }

  loadSideNavFromLocalStorage() {
    const value = localStorage.getItem(this.sideNavKey);
    if (!value) return;
    this.sideNavIsOpen = value === 'true';
  }
}
