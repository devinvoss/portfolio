import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastKind, toastService, useToasts } from '../state/toast';
import { fonts } from '../theme';
import { Icon, IconName } from './Icon';
import { Span, Text } from './Text';

const KINDS: Record<ToastKind, { background: string; icon: IconName }> = {
  success: { background: 'green', icon: 'check-circle' },
  warning: { background: 'orange', icon: 'warning' },
  error: { background: 'red', icon: 'error' },
  info: { background: 'blue', icon: 'info' }
};

function ToastItem({ toast }: { toast: Toast }) {
  // Slides in from the left, like the website's toast-enter
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }, [progress]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] });
  const kind = KINDS[toast.kind];

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: kind.background, opacity: progress, transform: [{ translateX }] }]}
    >
      <Icon name={kind.icon} size={24} style={styles.icon} />
      <Text style={styles.message}>
        {toast.title ? <Span style={styles.title}>{toast.title}  </Span> : null}
        {toast.message}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Click to close" onPress={() => toastService.remove(toast.id)} hitSlop={8}>
        <Icon name="clear" size={24} />
      </Pressable>
    </Animated.View>
  );
}

/** dvoss-toast: messages stacked at the top of the screen. */
export function Toasts() {
  const items = useToasts(state => state.items);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Full width less a margin on phones, three quarters on tablets, half on desktops
  const containerWidth = width <= 508 ? width - 32 : width <= 984 ? width * 0.75 : width * 0.5;

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 35, width: containerWidth, left: (width - containerWidth) / 2 }]}>
      {items.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 10000, elevation: 10000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 4,
    padding: 8,
    marginBottom: 4
  },
  icon: { marginRight: 8 },
  // Android ignores fontWeight for custom fonts, so bold is its own family
  title: { fontFamily: fonts.bold },
  message: { flex: 1, color: 'white', fontSize: 16 }
});
