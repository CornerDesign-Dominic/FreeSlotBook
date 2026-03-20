export const colorTokens = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceSoft: '#ECEFF3',
  border: '#D7DCE2',
  textPrimary: '#1F2329',
  textSecondary: '#66707A',
  accent: '#2F343B',
  accentSoft: '#E6EAEE',
  shadow: 'rgba(18, 24, 32, 0.08)',
} as const;

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

export const shadowTokens = {
  soft: {
    shadowColor: '#121820',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
} as const;
