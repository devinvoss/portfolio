import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// The Material theme's primary 500
const PRIMARY = '#43614b';

/** mat-progress-bar mode="indeterminate": a bar sliding across the top of its container. */
export function ProgressBar() {
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.4, width] });

  return (
    <View
      accessibilityRole="progressbar"
      style={styles.track}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.bar, { width: width * 0.4, transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, overflow: 'hidden', backgroundColor: 'rgba(67, 97, 75, 0.25)' },
  bar: { height: 4, backgroundColor: PRIMARY }
});
