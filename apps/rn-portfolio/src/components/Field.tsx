import { ComponentRef, ReactNode, Ref, useState } from 'react';
import { Platform, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { Icon, IconName } from './Icon';
import { Text, textStyles } from './Text';

/** .dv-field: a label over its control, with an optional hint. */
export function Field({ label, hint, error, children, style }: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={textStyles.fieldLabel}>{label}</Text> : null}
      {children}
      {error ? (
        <Text style={[textStyles.fieldHint, { color: colors.error }]} accessibilityRole="alert">{error}</Text>
      ) : hint ? (
        <Text style={textStyles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export interface InputProps extends TextInputProps {
  icon?: IconName;
  invalid?: boolean;
  /** Inside a dark panel (.dv-dark .dv-input) */
  dark?: boolean;
  /** Grow with the text between these many rows, like cdkTextareaAutosize. */
  minRows?: number;
  maxRows?: number;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

const LINE_HEIGHT = 24;
const TEXTAREA_PADDING = 10;

/** .dv-input, with an icon inside on the left when given one. Multiline inputs grow with their text. */
export function Input({
  ref, icon, invalid, dark, editable = true, multiline, minRows = 2, maxRows, style, onFocus, onBlur, onContentSizeChange, ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  // Native multiline inputs grow by themselves between these. A web textarea doesn't, so it's sized from
  // its scroll height, which already includes the padding (plus the 1px borders), so it settles at once.
  const minHeight = minRows * LINE_HEIGHT + TEXTAREA_PADDING * 2 + 2;
  const maxHeight = maxRows ? maxRows * LINE_HEIGHT + TEXTAREA_PADDING * 2 + 2 : undefined;
  const textareaSize = Platform.OS === 'web'
    ? { height: Math.min(Math.max(contentHeight + 2, minHeight), maxHeight ?? Infinity) }
    : { minHeight, maxHeight };

  let borderColor: string = dark ? colors.darkBorder : colors.fieldBorder;
  if (focused) borderColor = dark ? colors.darkMuted : colors.buttonFocus;
  if (invalid) borderColor = colors.error;

  return (
    <View style={styles.wrapper}>
      {icon && <Icon name={icon} size={20} color={colors.fieldMuted} style={styles.icon} />}
      <TextInput
        ref={ref}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={dark ? colors.darkMuted : colors.fieldBorderHover}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        onContentSizeChange={event => {
          const next = Math.round(event.nativeEvent.contentSize.height);
          setContentHeight(current => Math.abs(current - next) > 1 ? next : current);
          onContentSizeChange?.(event);
        }}
        style={[
          styles.input,
          dark ? styles.dark : null,
          multiline ? [styles.textarea, textareaSize] : null,
          icon ? styles.hasIcon : null,
          !editable ? styles.disabled : null,
          { borderColor },
          focused ? { boxShadow: `0 0 0 3px ${invalid ? 'rgba(227, 19, 37, 0.2)' : dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(67, 88, 99, 0.2)'}` } : null,
          style
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  wrapper: { position: 'relative', justifyContent: 'center' },
  icon: { position: 'absolute', left: 12, zIndex: 1 },
  input: {
    width: '100%',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    backgroundColor: colors.white,
    color: colors.button,
    outlineStyle: 'none'
  } as never,
  hasIcon: { paddingLeft: 40 },
  textarea: { paddingVertical: TEXTAREA_PADDING, lineHeight: LINE_HEIGHT, textAlignVertical: 'top' },
  dark: { backgroundColor: colors.darkInput, color: colors.darkText },
  disabled: { backgroundColor: colors.dvLightGray, color: colors.fieldMuted }
});
