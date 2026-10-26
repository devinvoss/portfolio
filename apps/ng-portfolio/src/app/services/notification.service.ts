import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReplyNotification } from '@portfolio/models';
import { catchError, EMPTY, filter, fromEvent, map, merge, Observable, of, switchMap, tap, timer } from 'rxjs';
import { UserService } from './user.service';

export const NOTIFICATION_POLL_MS = 60_000;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private document = inject(DOCUMENT);
  private userService = inject(UserService);

  readonly unreadCount = signal(0);

  constructor() {
    // While someone is signed in, check for new notifications every minute and whenever the tab comes back into view.
    const tabShown$ = fromEvent(this.document, 'visibilitychange').pipe(filter(() => this.document.visibilityState === 'visible'));
    this.userService.user$.pipe(
      switchMap(user => user
        ? merge(timer(0, NOTIFICATION_POLL_MS), tabShown$).pipe(
          filter(() => this.document.visibilityState !== 'hidden'),
          switchMap(() => this.fetchUnreadCount())
        )
        : of(0)),
      takeUntilDestroyed()
    ).subscribe(count => this.unreadCount.set(count));
  }

  getNotifications(): Observable<ReplyNotification[]> {
    return this.http.get<ReplyNotification[]>('api/notifications');
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>('api/notifications/read', {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  private fetchUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>('api/notifications/unread-count').pipe(
      map(res => res.count),
      // A failed check keeps the last count rather than clearing the badge.
      catchError(() => EMPTY)
    );
  }
}
