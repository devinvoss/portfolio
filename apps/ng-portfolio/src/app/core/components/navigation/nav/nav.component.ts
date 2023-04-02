import { Component } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap, Observable } from 'rxjs';

import { DestroyableComponent } from '../../destroyable/destroyable.component';
import { INavigation } from '@app/models';
import { UserService } from '@app/services';

@Component({
  selector: 'dvoss-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent extends DestroyableComponent {

  userRoutes$: Observable<INavigation[]> = this.userService.getUserRoutes().pipe(this.takeUntilDestroyed);
  navRoutes$: Observable<INavigation[]>;

  constructor(private userService: UserService, private router: Router) {
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
    routes.forEach(route => {
      route.isActive = (route.route && url.toLocaleLowerCase().indexOf(route.route.toLowerCase()) > -1) ? true : false;
      if (route.items && route.items.length > 0) {
        let childRoutes: INavigation[] = this.setCurrentRouteTree(route.items, url);
        route.isOpen = (childRoutes.filter(x => x.isActive || x.isOpen).length > 0) || route.isActive ? true : false;
        route.items = [...childRoutes];
      }
    })
    return routes;
  }

}
