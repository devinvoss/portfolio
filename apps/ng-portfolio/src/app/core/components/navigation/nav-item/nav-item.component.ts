import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { INavigation, NavigationType } from '@app/models';

@Component({
  selector: 'dvoss-nav-item',
  templateUrl: './nav-item.component.html',
  styleUrls: ['./nav-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class NavItemComponent {

  @Input() navItem!: INavigation;
  /* Indicates how many levels deep this NavItem is in the nav tree */
  @Input()
  set level(value: number) {
    this._level = value;
    this.nextLevel = value + 1;
  }
  get level(): number {
    return this._level;
  }

  private _level = 0;
  nextLevel = 0;
  navType = NavigationType;


  toggleNav() {
    this.navItem.isOpen = !this.navItem.isOpen;
  }
}
