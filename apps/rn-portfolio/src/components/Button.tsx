import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, PressableStateCallbackType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { absoluteFill, colors } from '../theme';
import { Text } from './Text';

/** react-native-web adds hovered and focused to Pressable's state */
export type InteractionState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

type Variant = 'primary' | 'delete' | 'clear' | 'edit';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  variant?: Variant;
  loading?: boolean;
  /** Inside a dark panel, where the usual dark slate would disappear (.dv-dark .dv-button). */
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Padding for the text, e.g. the taller sign-in buttons. */
  contentStyle?: StyleProp<ViewStyle>;
  size?: 'sm' | 'base' | 'lg';
}

const background: Record<Variant, { idle: string; active: string }> = {
  primary: { idle: colors.button, active: colors.buttonFocus },
  delete: { idle: colors.buttonDelete, active: colors.buttonDelete },
  clear: { idle: 'transparent', active: 'rgba(255, 255, 255, 0.15)' },
  edit: { idle: colors.white, active: colors.slate200 }
};

/** dvoss-button with the .dv-button styles: shows a spinner in place of its text while loading. */
export function Button({ children, variant = 'primary', loading = false, dark = false, disabled, style, contentStyle, size = 'sm', ...props }: ButtonProps) {
  const palette = dark && variant === 'primary' ? { idle: colors.darkButton, active: '#56707d' } : background[variant];
  const textColor = variant === 'edit' ? colors.dvOrange : colors.white;
  const fontSize = size === 'lg' ? 18 : size === 'base' || variant === 'clear' ? 16 : 14;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      accessibilityState={{ disabled: !!(disabled || loading), busy: loading }}
      style={(state: InteractionState) => [
        styles.button,
        variant === 'clear' ? styles.clear : null,
        variant === 'edit' ? styles.edit : null,
        { backgroundColor: (state.pressed || state.hovered || state.focused) && !disabled ? palette.active : palette.idle },
        disabled ? styles.disabled : null,
        style
      ]}
      {...props}
    >
      <View style={[styles.content, contentStyle, loading ? styles.hidden : null]}>
        {typeof children === 'string' ? (
          <Text weight="medium" style={{ color: textColor, fontSize }}>{children}</Text>
        ) : children}
      </View>
      {loading && (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator size="small" color={textColor} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 72,
    borderRadius: 6,
    justifyContent: 'center'
  },
  content: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  clear: { borderRadius: 0, height: '100%', paddingHorizontal: 8 },
  edit: { paddingHorizontal: 4 },
  hidden: { opacity: 0 },
  spinner: { ...absoluteFill, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 }
});
