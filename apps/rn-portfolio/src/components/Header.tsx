import { ReplyNotification } from '@portfolio/models';
import { useRouter } from 'expo-router';
import { ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationApi } from '../api/endpoints';
import { logout, useUser } from '../auth/session';
import { useBreakpoints } from '../hooks/use-breakpoints';
import { loginHref, useCurrentPath } from '../hooks/use-current-path';
import { markAllNotificationsRead, useUnreadCount } from '../state/notifications';
import { colors, fonts, HEADER_BORDER, HEADER_HEIGHT } from '../theme';
import { timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { Button, InteractionState } from './Button';
import { Icon } from './Icon';
import { Menu, MenuItem } from './Menu';
import { Span, Text } from './Text';

/** dvoss-header: the toolbar with the menu toggle, the site name, notifications and the account menu. */
export function Header({ onToggleNav }: { onToggleNav: () => void }) {
  const router = useRouter();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const currentPath = useCurrentPath();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle navigation"
          onPress={onToggleNav}
          style={(state: InteractionState) => [styles.iconButton, state.hovered || state.pressed ? styles.hover : null]}
        >
          <Icon name="menu" />
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.navigate('/home')} style={styles.titleButton}>
          <Text weight="medium" numberOfLines={1} style={styles.title}>Devin Voss&apos; Portfolio</Text>
        </Pressable>
        <View style={styles.spacer} />
        {user ? (
          <>
            <NotificationButton />
            <UserButton />
          </>
        ) : (
          <Button variant="clear" onPress={() => router.navigate(loginHref(currentPath))}>Log In</Button>
        )}
      </View>
      <View style={styles.border} />
    </View>
  );
}

function NotificationButton() {
  const router = useRouter();
  const unread = useUnreadCount(state => state.count);
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ReplyNotification[] | null>(null);

  // Opening the menu counts as reading them; the list still marks which ones were new
  const openMenu = () => {
    setOpen(true);
    setNotifications(null);
    notificationApi.list().then(
      list => {
        setNotifications(list);
        if (list.some(notification => !notification.read)) {
          markAllNotificationsRead().catch(() => undefined);
        }
      },
      () => setNotifications([])
    );
  };

  const openNotification = (notification: ReplyNotification) => {
    setOpen(false);
    router.navigate(notification.subjectType === 'recommendation'
      ? { pathname: '/recommendations/[id]', params: { id: notification.movieId, comment: notification.commentId } }
      : { pathname: '/movie/detail/[id]', params: { id: notification.movieId, comment: notification.commentId } });
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onPress={openMenu}
        style={(state: InteractionState) => [styles.userButton, state.hovered || state.pressed || open ? styles.hover : null]}
      >
        <View>
          <Icon name={unread ? 'notifications-active' : 'notifications'} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <Menu visible={open} onClose={() => setOpen(false)} triggerRef={triggerRef} width={320}>
        {notifications === null ? (
          <Text style={styles.menuNote}>Loading...</Text>
        ) : notifications.length === 0 ? (
          <Text style={styles.menuNote}>No notifications yet. Replies to your comments show up here.</Text>
        ) : notifications.map(notification => (
          <MenuItem
            key={notification.id}
            onPress={() => openNotification(notification)}
            style={[styles.notification, !notification.read ? styles.unread : null]}
          >
            <View style={styles.notificationText}>
              <Text style={styles.notificationBody}>
                <Span style={styles.strong}>{notification.actorName}</Span>
                {notification.type === 'reply' ? ' replied to your comment on ' : ' replied to you on '}
                <Span style={styles.strong}>{notification.movieTitle}</Span>
              </Text>
              <Text style={styles.notificationTime}>{timeAgo(notification.createdDate)}</Text>
            </View>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function UserButton() {
  const router = useRouter();
  const user = useUser();
  const { sm } = useBreakpoints();
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const [open, setOpen] = useState(false);

  if (!user) {
    return null;
  }

  const signOut = async () => {
    setOpen(false);
    await logout();
    router.navigate('/home');
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={`Account menu for ${user.displayName}`}
        onPress={() => setOpen(true)}
        style={(state: InteractionState) => [styles.userButton, state.hovered || state.pressed || open ? styles.hover : null]}
      >
        {user.avatarUrl ? (
          <Avatar uri={user.avatarUrl} size={32} />
        ) : (
          // Stands in for the picture so the button isn't empty on phones, where the name is hidden
          <Icon name="account-circle" size={32} />
        )}
        {sm && <Text style={styles.userName}>{user.displayName}</Text>}
      </Pressable>
      <Menu visible={open} onClose={() => setOpen(false)} triggerRef={triggerRef}>
        {/* The name is hidden in the header on phones, so the menu says who's signed in */}
        {!sm && <Text style={styles.menuName}>{user.displayName}</Text>}
        {/* The account page is for members; the admin is managed separately */}
        {user.role === 'member' && (
          <MenuItem icon="manage-accounts" label="Account" onPress={() => { setOpen(false); router.navigate('/account'); }} />
        )}
        <MenuItem icon="logout" label="Log Out" onPress={signOut} />
      </Menu>
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.navBackground, zIndex: 10 },
  toolbar: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  iconButton: { height: '100%', justifyContent: 'center', paddingHorizontal: 8, marginRight: 4 },
  hover: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  titleButton: { flexShrink: 1, justifyContent: 'center', height: '100%' },
  title: { color: colors.white, fontSize: 20, lineHeight: 28 },
  spacer: { flex: 1 },
  userButton: { flexDirection: 'row', alignItems: 'center', height: 44, gap: 8, paddingHorizontal: 8, borderRadius: 6, marginRight: 4 },
  userName: { color: colors.white, fontSize: 16 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dvOrange
  },
  badgeText: { color: colors.white, fontSize: 10, lineHeight: 12, fontFamily: fonts.bold },
  border: { height: HEADER_BORDER, backgroundColor: colors.dvGreen },
  menuNote: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: colors.fieldMuted },
  menuName: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: colors.gray500 },
  notification: { paddingVertical: 8 },
  unread: { backgroundColor: 'rgba(165, 214, 167, 0.25)' },
  notificationText: { flex: 1 },
  notificationBody: { fontSize: 16, lineHeight: 22, color: colors.text },
  strong: { fontFamily: fonts.bold },
  notificationTime: { fontSize: 12, lineHeight: 16, color: colors.fieldMuted }
});
