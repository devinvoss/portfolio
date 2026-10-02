import { Component, EventEmitter, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '@app/services';
import { MatToolbar } from '@angular/material/toolbar';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'dvoss-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbar, ButtonComponent, MatIcon, AsyncPipe]
})
export class HeaderComponent {
  private router = inject(Router);
  private userService = inject(UserService);

  @Output() toggleSideNav: EventEmitter<void> = new EventEmitter<void>();

  user$ = this.userService.user$;

  toggleNav() {
    this.toggleSideNav.emit();
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.userService.logout();
  }

  goHome() {
    this.router.navigate(['home']);
  }
}
