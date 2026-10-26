import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '@app/services';
import { MatToolbar } from '@angular/material/toolbar';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe, Location } from '@angular/common';

@Component({
  selector: 'dvoss-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [MatToolbar, ButtonComponent, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, AsyncPipe]
})
export class HeaderComponent {
  private router = inject(Router);
  private userService = inject(UserService);
  private location = inject(Location);

  @Output() toggleSideNav: EventEmitter<void> = new EventEmitter<void>();

  user$ = this.userService.user$;

  toggleNav() {
    this.toggleSideNav.emit();
  }

  login() {
    this.router.navigate(['/login'], { queryParams: { returnTo: this.location.path() } });
  }

  logout() {
    this.userService.logout();
  }

  goHome() {
    this.router.navigate(['home']);
  }
}
