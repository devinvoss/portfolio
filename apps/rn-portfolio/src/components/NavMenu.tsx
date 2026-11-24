import { Href, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { logout, useUser } from '../auth/session';
import { colors } from '../theme';
import { InteractionState } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

type NavItem =
  | { type: 'internal'; name: string; route: string }
  | { type: 'menu'; name: string; items: NavItem[] }
  | { type: 'action'; name: string; action: 'logout' };

// UserService's unauthenticatedRoutes and signedInRoutes
const PUBLIC_ROUTES: NavItem[] = [
  { type: 'internal', name: 'Home', route: 'home' },
  {
    type: 'menu',
    name: 'Movies',
    items: [
      { type: 'internal', name: "Devin's Watched", route: 'movie' },
      { type: 'internal', name: 'Recommendations', route: 'recommendations' }
    ]
  }
];

const SIGNED_IN_ROUTES: NavItem[] = [...PUBLIC_ROUTES, { type: 'action', name: 'Log Out', action: 'logout' }];

const isActive = (item: NavItem, path: string): boolean => {
  if (item.type === 'internal') {
    return path.toLowerCase().includes(item.route.toLowerCase());
  }
  return item.type === 'menu' && item.items.some(child => isActive(child, path));
};

/** dvoss-nav: the side navigation. A menu opens to show the current page and closes on tap. */
export function NavMenu() {
  const user = useUser();
  const pathname = usePathname();
  const routes = user ? SIGNED_IN_ROUTES : PUBLIC_ROUTES;

  // After each navigation, the menu holding the current page is the open one
  const activeMenus = useMemo(
    () => new Set(routes.filter(item => item.type === 'menu' && isActive(item, pathname)).map(item => item.name)),
    [routes, pathname]
  );
  const [openMenus, setOpenMenus] = useState(activeMenus);
  useEffect(() => setOpenMenus(activeMenus), [activeMenus]);

  const toggle = (name: string) => setOpenMenus(current => {
    const next = new Set(current);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    return next;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {routes.map(item => (
        <NavItemView key={item.name} item={item} level={0} path={pathname} openMenus={openMenus} onToggle={toggle} />
      ))}
    </ScrollView>
  );
}

function NavItemView({ item, level, path, openMenus, onToggle }: {
  item: NavItem;
  level: number;
  path: string;
  openMenus: Set<string>;
  onToggle: (name: string) => void;
}) {
  const router = useRouter();
  const open = item.type === 'menu' && openMenus.has(item.name);
  const highlighted = item.type === 'menu' ? open : item.type === 'internal' && isActive(item, path);

  const rotation = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rotation, { toValue: open ? 1 : 0, duration: 100, useNativeDriver: true }).start();
  }, [open, rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  const onPress = () => {
    if (item.type === 'menu') {
      onToggle(item.name);
    } else if (item.type === 'internal') {
      router.navigate(`/${item.route}` as Href);
    } else {
      logout().then(() => router.navigate('/home'));
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole={item.type === 'internal' ? 'link' : 'button'}
        accessibilityState={item.type === 'menu' ? { expanded: open } : { selected: highlighted }}
        onPress={onPress}
        style={(state: InteractionState) => [styles.item, levelStyles[level], state.hovered || state.pressed || state.focused ? styles.hover : null]}
      >
        {(state: InteractionState) => (
          <>
            <Text style={[styles.label, levelText[level], { color: highlighted || state.hovered || state.focused ? colors.dvGreen : colors.white }]}>
              {item.name}
            </Text>
            {item.type === 'menu' && (
              <Animated.View style={{ transform: [{ rotate }] }}>
                <Icon name="chevron-right" />
              </Animated.View>
            )}
          </>
        )}
      </Pressable>
      {item.type === 'menu' && open && item.items.map(child => (
        <NavItemView key={child.name} item={child} level={level + 1} path={path} openMenus={openMenus} onToggle={onToggle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navBackground },
  content: { paddingVertical: 16 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingRight: 8 },
  hover: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  label: { fontSize: 16, lineHeight: 24 }
});

// .level-0, .level-1 and .level-2: each level is indented further and in smaller text
const levelStyles = [{ paddingLeft: 16 }, { paddingLeft: 32 }, { paddingLeft: 48 }];
const levelText = [{ fontSize: 16, lineHeight: 24 }, { fontSize: 14, lineHeight: 20 }, { fontSize: 12, lineHeight: 16 }];
