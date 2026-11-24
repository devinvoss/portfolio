import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

/** dvoss-skeleton-loader's card: a shimmering placeholder while something loads. */
export function SkeletonLoader({ style }: { style?: StyleProp<ViewStyle> }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: false })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({ inputRange: [0, 1], outputRange: [colors.skeleton, colors.skeletonShine] });
  return <Animated.View accessibilityLabel="Loading" style={[styles.card, { backgroundColor }, style]} />;
}

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 100, borderRadius: 6 }
});
