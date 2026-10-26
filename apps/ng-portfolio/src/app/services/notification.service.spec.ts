import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NOTIFICATION_POLL_MS, NotificationService } from './notification.service';
import { UserService } from './user.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let userService: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(NotificationService);
    userService = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
  });

  it('does not poll while signed out', () => {
    jest.advanceTimersByTime(NOTIFICATION_POLL_MS * 2);
    http.expectNone('api/notifications/unread-count');
    expect(service.unreadCount()).toBe(0);
  });

  it('polls the unread count while signed in and resets on sign-out', () => {
    userService.user$.next({ id: 'm', role: 'member', displayName: 'Sam' });
    jest.advanceTimersByTime(0);
    http.expectOne('api/notifications/unread-count').flush({ count: 2 });
    expect(service.unreadCount()).toBe(2);

    jest.advanceTimersByTime(NOTIFICATION_POLL_MS);
    http.expectOne('api/notifications/unread-count').flush({ count: 3 });
    expect(service.unreadCount()).toBe(3);

    userService.user$.next(null);
    expect(service.unreadCount()).toBe(0);
    jest.advanceTimersByTime(NOTIFICATION_POLL_MS);
    http.expectNone('api/notifications/unread-count');
  });

  it('clears the badge when everything is marked read', () => {
    service.unreadCount.set(4);
    service.markAllRead().subscribe();
    http.expectOne({ method: 'POST', url: 'api/notifications/read' }).flush(null);
    expect(service.unreadCount()).toBe(0);
  });
});
