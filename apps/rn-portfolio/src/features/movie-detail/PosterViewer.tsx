import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InteractionState } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useBreakpoints } from '../../hooks/use-breakpoints';

/** The movie poster at full page size. Tapping the dark area, the close button or Back closes it. */
export function PosterViewer({ imageUrl, title, visible, onClose }: { imageUrl: string; title: string; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { sm } = useBreakpoints();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={`${title} poster, tap to close`}
        onPress={onClose}
        style={[styles.viewer, { padding: sm ? 40 : 16, paddingTop: insets.top + (sm ? 40 : 16), paddingBottom: insets.bottom + (sm ? 40 : 16) }]}
      >
        <View style={styles.posterWrapper} pointerEvents="none">
          <Image source={{ uri: imageUrl }} style={styles.poster} contentFit="contain" accessibilityLabel={`${title} poster`} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close poster"
        onPress={onClose}
        style={(state: InteractionState) => [styles.close, { top: insets.top + 12 }, state.hovered || state.pressed ? styles.closeHover : null]}
      >
        <Icon name="close" />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', alignItems: 'center', justifyContent: 'center' },
  posterWrapper: { width: '100%', height: '100%' },
  poster: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  closeHover: { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
});
