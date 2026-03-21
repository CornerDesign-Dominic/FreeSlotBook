import type { AppTheme } from '@/src/settings/types';

export const lightColorTokens = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceSoft: '#ECEFF3',
  border: '#D7DCE2',
  textPrimary: '#1F2329',
  textSecondary: '#66707A',
  accent: '#2F343B',
  accentSoft: '#E6EAEE',
  shadow: 'rgba(18, 24, 32, 0.08)',
  overlay: 'rgba(18, 24, 32, 0.18)',
} as const;

export const darkColorTokens = {
  background: '#101418',
  surface: '#171C22',
  surfaceSoft: '#20262D',
  border: '#2C343D',
  textPrimary: '#F3F5F7',
  textSecondary: '#A2ADB8',
  accent: '#E6EAEE',
  accentSoft: '#2B333B',
  shadow: 'rgba(0, 0, 0, 0.34)',
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

export const colorTokensByTheme = {
  light: lightColorTokens,
  dark: darkColorTokens,
} as const satisfies Record<
  AppTheme,
  {
    background: string;
    surface: string;
    surfaceSoft: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentSoft: string;
    shadow: string;
    overlay: string;
  }
>;

export const radiusTokens = {
  small: 12,
  medium: 16,
  large: 20,
} as const;

export const spacingTokens = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
} as const;

export const typographyTokens = {
  title: 30,
  sectionTitle: 19,
  body: 16,
  meta: 13,
} as const;

export const lightShadowTokens = {
  soft: {
    shadowColor: '#121820',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
} as const;

export const darkShadowTokens = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 4,
  },
} as const;

export const shadowTokensByTheme = {
  light: lightShadowTokens,
  dark: darkShadowTokens,
} as const satisfies Record<
  AppTheme,
  {
    soft: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  }
>;
