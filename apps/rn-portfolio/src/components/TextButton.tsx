import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { InteractionState } from './Button';
import { Icon, IconName } from './Icon';
import { Text } from './Text';

export interface TextButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  icon?: IconName;
  /** A liked comment (.liked) */
  active?: boolean;
  danger?: boolean;
  /** Inside a dark panel (.dv-dark .dv-text-button) */
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** .dv-text-button: the small text buttons, like the actions under a comment. */
export function TextButton({ children, icon, active, danger, dark, disabled, style, ...props }: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state: InteractionState) => [
        styles.button,
        (state.hovered || state.pressed) && !disabled ? { backgroundColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' } : null,
        disabled ? styles.disabled : null,
        style
      ]}
      {...props}
    >
      {(state: InteractionState) => {
        const hover = (state.hovered || state.pressed) && !disabled;
        let color: string = dark ? colors.darkMuted : colors.fieldMuted;
        if (hover) color = dark ? colors.darkText : colors.button;
        if (active) color = dark ? colors.darkLink : colors.info;
        if (danger) color = dark ? colors.darkDanger : colors.buttonDelete;
        return (
          <>
            {icon && <Icon name={icon} size={18} color={color} />}
            {typeof children === 'string' || typeof children === 'number' ? (
              <Text weight="medium" style={[styles.label, { color }]}>{children}</Text>
            ) : children}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  label: { fontSize: 14, lineHeight: 20 },
  disabled: { opacity: 0.5 }
});
