import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap, Observable } from 'rxjs';

import { DestroyableComponent } from '../../destroyable/destroyable.component';
import { INavigation } from '@app/models';
import { UserService } from '@app/services';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'dvoss-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavItemComponent, AsyncPipe]
})
export class NavComponent extends DestroyableComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  userRoutes$: Observable<INavigation[]> = this.userService.getUserRoutes().pipe(this.takeUntilDestroyed);
  navRoutes$: Observable<INavigation[]>;

  constructor() {
    super();

    this.navRoutes$ = this.router.events.pipe(
      this.takeUntilDestroyed,
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      mergeMap((ne: NavigationEnd) => this.userRoutes$.pipe(
        map(routes => this.setCurrentRouteTree(routes, ne.urlAfterRedirects))
      ))
    );
  }

  setCurrentRouteTree(routes: INavigation[], url: string): INavigation[] {
    return routes.map(route => {
      const isActive = !!route.route && url.toLocaleLowerCase().indexOf(route.route.toLowerCase()) > -1;
      if (!route.items || route.items.length === 0) {
        return { ...route, isActive };
      }
      const items = this.setCurrentRouteTree(route.items, url);
      const isOpen = isActive || items.some(x => x.isActive || x.isOpen);
      return { ...route, isActive, isOpen, items };
    });
  }

}
