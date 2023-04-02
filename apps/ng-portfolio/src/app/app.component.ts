import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, withLatestFrom } from 'rxjs';
import { DestroyableComponent } from './core/components';
import { UserService, WindowService } from './services';

@Component({
  selector: 'portfolio-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends DestroyableComponent implements OnInit {

  readonly sideNavKey: string = 'dvoss-side-nav';

  sideNavMode: 'side' | 'over' = 'side';
  sideNavIsOpen = true;

  navigationEnd$ = this.router.events.pipe(
    this.takeUntilDestroyed,
    filter((e): e is NavigationEnd => e instanceof NavigationEnd)
  );

  constructor(private windowService: WindowService, private router: Router, private userService: UserService) {
    super();
  }

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
