import { useMemo } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSettings } from '@/src/settings/provider';
import type { AppTheme } from '@/src/settings/types';
import {
  colorTokensByTheme,
  radiusTokens,
  shadowTokensByTheme,
  spacingTokens,
  typographyTokens,
} from './tokens';

export function getThemeColors(themeMode: AppTheme) {
  return colorTokensByTheme[themeMode];
}

export function getThemeShadows(themeMode: AppTheme) {
  return shadowTokensByTheme[themeMode];
}

export const theme = {
  radius: radiusTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
} as const;

function buildUiStyles(themeMode: AppTheme) {
  const colors = getThemeColors(themeMode);
  const shadows = getThemeShadows(themeMode);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacingTokens[16],
      paddingBottom: spacingTokens[32],
    },
    centeredLoading: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: spacingTokens[16],
    },
    pageTitle: {
      color: colors.textPrimary,
      fontSize: typographyTokens.title,
      fontWeight: '700',
      marginBottom: spacingTokens[20],
      letterSpacing: -0.4,
    },
    screenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacingTokens[12],
      marginBottom: spacingTokens[16],
    },
    screenHeaderTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: typographyTokens.sectionTitle,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    screenHeaderHomeButton: {
      width: 40,
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.small,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.soft,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: typographyTokens.sectionTitle,
      fontWeight: '600',
      marginBottom: spacingTokens[12],
      letterSpacing: -0.2,
    },
    bodyText: {
      color: colors.textPrimary,
      fontSize: typographyTokens.body,
    },
    secondaryText: {
      color: colors.textSecondary,
      fontSize: typographyTokens.body,
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: typographyTokens.meta,
    },
    panel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.large,
      padding: spacingTokens[16],
      marginBottom: spacingTokens[16],
      ...shadows.soft,
    },
    subtlePanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.medium,
      padding: spacingTokens[12],
    },
    timelineShell: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.medium,
      padding: spacingTokens[12],
    },
    linkText: {
      color: colors.accent,
      fontSize: typographyTokens.body,
      textDecorationLine: 'underline',
    },
    button: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.small,
      backgroundColor: colors.surface,
      paddingHorizontal: spacingTokens[12],
      paddingVertical: spacingTokens[12],
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    buttonText: {
      color: colors.textPrimary,
      fontSize: typographyTokens.body,
      fontWeight: '500',
    },
    outlineAction: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.small,
      backgroundColor: colors.surface,
      paddingHorizontal: spacingTokens[12],
      paddingVertical: spacingTokens[12],
      alignItems: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.small,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: spacingTokens[12],
      paddingVertical: spacingTokens[12],
      fontSize: typographyTokens.body,
    },
    listItem: {
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingTop: spacingTokens[12],
      marginTop: spacingTokens[12],
    },
    footerRow: {
      alignItems: 'flex-end',
      marginTop: spacingTokens[4],
    },
    calendarNavigation: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacingTokens[16],
      gap: spacingTokens[12],
    },
    calendarNavigationButton: {
      width: 36,
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusTokens.medium,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.soft,
    },
    calendarNavigationTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: typographyTokens.sectionTitle,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radiusTokens.large,
      borderTopRightRadius: radiusTokens.large,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacingTokens[16],
      ...shadows.soft,
    },
  });
}

const uiStylesByTheme = {
  light: buildUiStyles('light'),
  dark: buildUiStyles('dark'),
} as const;

export function useAppTheme() {
  const { theme: themeMode } = useAppSettings();

  return useMemo(() => {
    const colors = getThemeColors(themeMode);
    const shadows = getThemeShadows(themeMode);

    return {
      themeMode,
      theme: {
        colors,
        radius: radiusTokens,
        spacing: spacingTokens,
        typography: typographyTokens,
        shadow: shadows,
      },
      uiStyles: uiStylesByTheme[themeMode],
    };
  }, [themeMode]);
}

export function useBottomSafeContentStyle(
  baseStyle?: StyleProp<ViewStyle>,
  designPaddingBottom = spacingTokens[16]
) {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => [baseStyle, { paddingBottom: insets.bottom + designPaddingBottom }],
    [baseStyle, designPaddingBottom, insets.bottom]
  );
}
