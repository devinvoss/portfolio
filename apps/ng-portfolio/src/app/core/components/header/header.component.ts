import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationService, UserService } from '@app/services';
import { ReplyNotification } from '@portfolio/models';
import { MatToolbar } from '@angular/material/toolbar';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe, Location } from '@angular/common';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'dvoss-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [MatToolbar, ButtonComponent, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, RouterLink, AsyncPipe, TimeAgoPipe]
})
export class HeaderComponent {
  private router = inject(Router);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private location = inject(Location);

  @Output() toggleSideNav: EventEmitter<void> = new EventEmitter<void>();

  user$ = this.userService.user$;
  unreadCount = this.notificationService.unreadCount;
  notifications = signal<ReplyNotification[] | null>(null);

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

  // Opening the menu counts as reading them; the list still marks which ones were new.
  openNotifications() {
    this.notifications.set(null);
    this.notificationService.getNotifications().subscribe({
      next: notifications => {
        this.notifications.set(notifications);
        if (notifications.some(notification => !notification.read)) {
          this.notificationService.markAllRead().subscribe();
        }
      },
      error: () => this.notifications.set([])
    });
  }

  openNotification(notification: ReplyNotification) {
    this.router.navigate(['/movie/detail', notification.movieId], { fragment: `comment-${notification.commentId}` });
  }
}
