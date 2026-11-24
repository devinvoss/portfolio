import { Image } from 'expo-image';
import { StyleProp } from 'react-native';
import { ImageStyle } from 'expo-image';

/**
 * A profile picture from Google or GitHub. Google's avatar host can refuse requests with a referrer;
 * native apps don't send one, and the web build sets a no-referrer policy for the page (see the root layout).
 */
export function Avatar({ uri, size, style }: { uri: string; size: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: size / 2 }, style]} contentFit="cover" accessibilityIgnoresInvertColors />;
}
