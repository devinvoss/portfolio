import { ComponentRef, ReactNode, RefObject, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { InteractionState } from './Button';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

interface Anchor {
  top: number;
  right: number;
}

/**
 * mat-menu with xPosition="before": a panel under its trigger, lined up with the trigger's right edge.
 * Tapping outside closes it.
 */
export function Menu({ visible, onClose, triggerRef, width, children }: {
  visible: boolean;
  onClose: () => void;
  triggerRef: RefObject<ComponentRef<typeof View> | null>;
  width?: number;
  children: ReactNode;
}) {
  const window = useWindowDimensions();
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!visible) {
      setAnchor(null);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, triggerWidth, height) => {
      setAnchor({ top: y + height, right: Math.max(window.width - (x + triggerWidth), 8) });
    });
  }, [visible, triggerRef, window.width]);

  const panelWidth = width ? Math.min(width, window.width - 32) : undefined;

  return (
    // Translucent so the modal's coordinates match the window's on Android, where the app draws under the status bar
    <Modal visible={visible && !!anchor} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      {anchor && (
        <View style={[styles.panel, { top: anchor.top, right: anchor.right, width: panelWidth, maxHeight: window.height - anchor.top - 16 }]}>
          <ScrollView>{children}</ScrollView>
        </View>
      )}
    </Modal>
  );
}

/** mat-menu-item */
export function MenuItem({ icon, label, children, onPress, style }: {
  icon?: IconName;
  label?: string;
  children?: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={(state: InteractionState) => [styles.item, state.hovered || state.pressed ? styles.itemHover : null, style]}
    >
      {icon && <Icon name={icon} color={colors.fieldMuted} />}
      {label ? <Text style={styles.label}>{label}</Text> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    minWidth: 112,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    boxShadow: '0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)'
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 48,
    paddingHorizontal: 16
  },
  itemHover: { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
  label: { fontSize: 16, color: colors.text }
});
