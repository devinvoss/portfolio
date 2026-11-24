import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { StyleProp, TextStyle } from 'react-native';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** A Material icon, by the same names as the website's mat-icon (with dashes for underscores). */
export function Icon({ name, size = 24, color = 'white', style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialIcons name={name} size={size} color={color} style={style} accessibilityElementsHidden importantForAccessibility="no" />;
}
