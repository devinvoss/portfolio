import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { notificationApi } from '../api/endpoints';
import { useUser } from '../auth/session';

export const NOTIFICATION_POLL_MS = 60_000;

export const useUnreadCount = create<{ count: number }>(() => ({ count: 0 }));

async function refreshUnreadCount() {
  try {
    useUnreadCount.setState({ count: await notificationApi.unreadCount() });
  } catch {
    // A failed check keeps the last count rather than clearing the badge
  }
}

export async function markAllNotificationsRead() {
  await notificationApi.markAllRead();
  useUnreadCount.setState({ count: 0 });
}

/**
 * While someone is signed in, checks for new notifications every minute and whenever the app comes
 * back to the foreground, like ng-portfolio's NotificationService does with the tab's visibility.
 */
export function useNotificationPolling() {
  const user = useUser();

  useEffect(() => {
    if (!user) {
      useUnreadCount.setState({ count: 0 });
      return;
    }

    refreshUnreadCount();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshUnreadCount();
      }
    }, NOTIFICATION_POLL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshUnreadCount();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [user]);
}
