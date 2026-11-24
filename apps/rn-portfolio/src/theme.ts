// The colors from ng-portfolio's styles/global/colors.scss and tailwind.config.js, by the same names.
export const colors = {
  dvOrange: '#F16347',
  dvGreen: '#a5d6a7',
  dvGreen100: '#85aa86',
  dvLightGray: '#F5F5F5',
  dvDarkGray: '#5A5A5A',
  dvLightBrown: '#BFAFA6',
  dvBrown: '#AA968A',

  navBackground: '#444444',

  warning: '#FF612B',
  error: '#E31325',
  info: '#002677',
  success: '#35832f',

  button: '#263238',
  buttonDelete: '#910e19',
  buttonFocus: '#435863',

  fieldBorder: '#d4d4d4',
  fieldBorderHover: '#a3a3a3',
  fieldMuted: '#6b6b6b',

  // Dark panels, like the comments on the movie page
  darkPanel: 'rgba(18, 18, 18, 0.88)',
  darkSurface: 'rgba(255, 255, 255, 0.06)',
  darkHeader: 'rgba(255, 255, 255, 0.12)',
  darkText: '#e5e5e5',
  darkMuted: '#a3a3a3',
  darkBorder: '#4a4a4a',
  darkInput: '#262626',
  darkLink: '#8ab4f8',
  darkDanger: '#f28b82',
  darkButton: '#435863',

  // Material's light theme text, and the accent palette's 500 used by the genre chips
  text: 'rgba(0, 0, 0, 0.87)',
  accent: '#507674',
  white: '#ffffff',
  black: '#000000',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray500: '#6b7280',
  red700: '#b91c1c',
  slate200: '#e2e8f0',
  skeleton: '#dadbdd',
  skeletonShine: '#cccccc',
} as const;

// Roboto, as on the website. Each weight is its own font family in React Native.
export const fonts = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
  italic: 'Roboto_400Regular_Italic',
} as const;

export type FontWeight = keyof typeof fonts;

// Tailwind's breakpoints, plus the 3xl added in ng-portfolio's tailwind.config.js
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
  xxxl: 2500,
} as const;

// The Angular CDK breakpoints the sidenav uses: phones are XSmall, tablets Small
export const PHONE_MAX_WIDTH = 599.98;
export const TABLET_MAX_WIDTH = 959.98;

/** The header is a 64px toolbar with a 3px green border under it. */
export const HEADER_HEIGHT = 64;
export const HEADER_BORDER = 3;
export const SIDE_NAV_WIDTH = 240;

/** Fills the parent, like Tailwind's absolute inset-0 (StyleSheet.absoluteFillObject is gone in RN 0.88). */
export const absoluteFill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;
