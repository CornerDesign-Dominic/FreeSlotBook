import type { AppTheme } from '@/src/settings/types';

export const lightColorTokens = {
  background: '#FAFBFD',
  surface: '#FFFFFF',
  surfaceSoft: '#F5F7FA',
  border: '#E6EAF0',
  textPrimary: '#111418',
  textSecondary: '#66707A',
  accent: '#6366F1',
  accentSoft: '#EEF0FF',
  shadow: 'rgba(15, 23, 42, 0.06)',
  overlay: 'rgba(15, 23, 42, 0.14)',
} as const;

export const darkColorTokens = {
  background: '#090B0E',
  surface: '#111418',
  surfaceSoft: '#171B20',
  border: '#232A32',
  textPrimary: '#F5F7FA',
  textSecondary: '#98A2AD',
  accent: '#818CF8',
  accentSoft: 'rgba(129,140,248,0.18)',
  shadow: 'rgba(0,0,0,0.42)',
  overlay: 'rgba(0,0,0,0.56)',
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
