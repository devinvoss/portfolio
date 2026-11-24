import { useWindowDimensions } from 'react-native';
import { breakpoints, PHONE_MAX_WIDTH, TABLET_MAX_WIDTH } from '../theme';

/** Tailwind's min-width breakpoints and the CDK's phone/tablet sizes, from the window width. */
export function useBreakpoints() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    sm: width >= breakpoints.sm,
    md: width >= breakpoints.md,
    lg: width >= breakpoints.lg,
    xl: width >= breakpoints.xl,
    xxl: width >= breakpoints.xxl,
    xxxl: width >= breakpoints.xxxl,
    isPhone: width <= PHONE_MAX_WIDTH,
    isPhoneOrTablet: width <= TABLET_MAX_WIDTH
  };
}
