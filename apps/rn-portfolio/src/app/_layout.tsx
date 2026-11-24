import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Roboto_400Regular, Roboto_400Regular_Italic, Roboto_500Medium, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadSession } from '../auth/session';
import { Header } from '../components/Header';
import { NavMenu } from '../components/NavMenu';
import { Toasts } from '../components/Toasts';
import { useBreakpoints } from '../hooks/use-breakpoints';
import { useNotificationPolling } from '../state/notifications';
import { usePrefs } from '../state/prefs';
import { colors, SIDE_NAV_WIDTH } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Small lookups like the sign-in providers and genre counts; lists and comments keep their own state
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

// On the web, the sign-in popup lands back on this app; this hands its URL to the window that opened it
WebBrowser.maybeCompleteAuthSession();

// Google's avatar host can refuse requests with a referrer, so the web build sends none (the website does
// the same per image with referrerpolicy="no-referrer")
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const meta = document.createElement('meta');
  meta.name = 'referrer';
  meta.content = 'no-referrer';
  document.head.appendChild(meta);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_400Regular_Italic, Roboto_500Medium, Roboto_700Bold, ...MaterialIcons.font });

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          {/* expo-status-bar takes the style as a string; the lint rule is about the style prop of views */}
          {/* eslint-disable-next-line react/style-prop-object */}
          <StatusBar style="light" />
          <AppShell />
          <Toasts />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The website's layout: the header across the top, and the side nav beside the page on wide screens
 * ("side" mode, remembered between visits) or over it on phones and tablets ("over" mode).
 */
function AppShell() {
  const { isPhone, isPhoneOrTablet } = useBreakpoints();
  const pathname = usePathname();
  const sideNavOpen = usePrefs(state => state.sideNavOpen);
  const setSideNavOpen = usePrefs(state => state.setSideNavOpen);
  const [overOpen, setOverOpen] = useState(false);
  const mode = isPhoneOrTablet ? 'over' : 'side';
  const open = mode === 'side' ? sideNavOpen : overOpen;

  useNotificationPolling();

  // Switching to the overlay closes it, so a phone doesn't open with the menu covering the page
  useEffect(() => {
    setOverOpen(false);
  }, [mode]);

  // Navigating on a phone closes the menu
  useEffect(() => {
    if (isPhone) {
      setOverOpen(false);
    }
  }, [pathname, isPhone]);

  const toggle = () => (mode === 'side' ? setSideNavOpen(!sideNavOpen) : setOverOpen(!overOpen));

  return (
    <View style={styles.root}>
      <Header onToggleNav={toggle} />
      <Drawer
        open={open}
        onOpen={() => setOverOpen(true)}
        onClose={() => setOverOpen(false)}
        drawerType={mode === 'side' ? 'permanent' : 'front'}
        // In side mode, a closed nav takes no room; the page gets the full width
        drawerStyle={[styles.drawer, mode === 'side' && !open ? styles.drawerCollapsed : null]}
        // The website's sidenav has no backdrop
        overlayStyle={styles.overlay}
        swipeEnabled={mode === 'over'}
        renderDrawerContent={() => <NavMenu />}
      >
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.dvLightGray } }} />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dvLightGray },
  drawer: { width: SIDE_NAV_WIDTH, backgroundColor: colors.navBackground },
  drawerCollapsed: { width: 0, overflow: 'hidden' },
  overlay: { backgroundColor: 'transparent' }
});
