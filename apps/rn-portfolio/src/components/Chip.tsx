import { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { InteractionState } from './Button';
import { Text } from './Text';

/** The filter and sort chips on the movie list. */
export function Chip({ label, selected, empty, count, children, onPress, accessibilityLabel }: {
  label: string;
  selected: boolean;
  /** No movies match it with the current filters */
  empty?: boolean;
  count?: number;
  children?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={(state: InteractionState) => [
        styles.chip,
        state.hovered || state.pressed ? styles.hover : null,
        selected ? styles.selected : null,
        selected && (state.hovered || state.pressed) ? styles.selectedHover : null,
        empty && !selected ? styles.empty : null
      ]}
    >
      <Text weight="medium" style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
      {children}
      {count !== undefined && (
        <Text style={[styles.count, selected ? styles.selectedCount : null]}>{count}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.white
  },
  hover: { borderColor: colors.buttonFocus, backgroundColor: colors.dvLightGray },
  selected: { backgroundColor: colors.button, borderColor: colors.button },
  selectedHover: { backgroundColor: colors.buttonFocus, borderColor: colors.buttonFocus },
  empty: { opacity: 0.45 },
  label: { fontSize: 14, lineHeight: 20, color: colors.button },
  selectedLabel: { color: colors.white },
  count: { marginLeft: 6, fontSize: 12, lineHeight: 16, color: colors.fieldMuted },
  selectedCount: { color: 'rgba(255, 255, 255, 0.7)' }
});
