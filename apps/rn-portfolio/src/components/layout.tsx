import { ReactNode, useEffect, useRef } from 'react';
import { Animated, ScrollView, ScrollViewProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

/** .center-container: a column with p-2 that fills the page. */
export function CenterContainer({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.center, style]}>{children}</View>;
}

/** A scrolling page on the light gray background, like mat-sidenav-content. */
export function Page({ children, contentContainerStyle, ...props }: ScrollViewProps & { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
}

/** The website's fade-in enter animation (300ms). */
export function FadeIn({ children, style, duration = 300 }: { children: ReactNode; style?: StyleProp<ViewStyle>; duration?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [opacity, duration]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

/** The website's slide-up-in enter animation for list items. */
export function SlideUpIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [128, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** The white rounded panel with a soft shadow, like .search-panel and .editor-panel. */
export const panelStyle: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.dvLightGray },
  pageContent: { flexGrow: 1 },
  center: { flexGrow: 1, padding: 8 }
});
