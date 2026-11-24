import { StyleSheet, Text as RNText, TextProps as RNTextProps } from 'react-native';
import { colors, fonts, FontWeight } from '../theme';

export interface TextProps extends RNTextProps {
  weight?: FontWeight;
}

/** Text in Roboto. React Native has no font inheritance from the page, so every text goes through this. */
export function Text({ weight, style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  // Tailwind's base line height is 1.5; set one to match whatever size is used, unless the style picks its own
  const lineHeight = flat.lineHeight ?? (flat.fontSize ? Math.round(flat.fontSize * 1.5) : undefined);
  return (
    <RNText
      {...props}
      style={[weight || !flat.fontFamily ? { fontFamily: fonts[weight ?? 'regular'] } : null, style, lineHeight ? { lineHeight } : null]}
    />
  );
}

/** Inline text inside a Text that keeps its parent's font, like a <span>. */
export const Span = RNText;

/** The page's default text: 16px, Material's light-theme text color. */
export const textStyles = StyleSheet.create({
  body: { fontSize: 16, color: colors.text },
  // h1 and h2 from styles/global/headings.scss
  h1: { fontSize: 36, lineHeight: 40, fontFamily: fonts.medium, color: colors.text },
  h2: { fontSize: 20, lineHeight: 28, fontFamily: fonts.medium, color: colors.text },
  muted: { color: colors.fieldMuted },
  // .dv-field-label
  fieldLabel: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.fieldMuted },
  fieldHint: { fontSize: 12, lineHeight: 16, color: colors.fieldMuted },
  sm: { fontSize: 14, lineHeight: 20 },
  xs: { fontSize: 12, lineHeight: 16 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  xxl: { fontSize: 24, lineHeight: 32 },
  xxxl: { fontSize: 30, lineHeight: 36 },
  underline: { textDecorationLine: 'underline' }
});

export function H1(props: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[textStyles.h1, props.style]} />;
}

export function H2(props: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[textStyles.h2, props.style]} />;
}
