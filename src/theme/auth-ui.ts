import { StyleSheet } from 'react-native';

import { getActiveThemeMode, getThemeColors, getThemeShadows, theme } from './ui';

function buildAuthUiStyles(themeMode: 'light' | 'dark') {
  const colors = getThemeColors(themeMode);
  const shadows = getThemeShadows(themeMode);

  return StyleSheet.create({
    keyboardShell: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing[16],
      paddingTop: theme.spacing[32],
      paddingBottom: theme.spacing[32],
    },
    formWrap: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.radius.large,
      padding: theme.spacing[20],
      ...shadows.soft,
    },
    header: {
      marginBottom: theme.spacing[20],
    },
    title: {
      color: colors.textPrimary,
      fontSize: theme.typography.title,
      fontWeight: '700',
      letterSpacing: -0.4,
      marginBottom: theme.spacing[8],
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: theme.typography.body,
      lineHeight: 22,
    },
    fieldGroup: {
      marginBottom: theme.spacing[16],
    },
    label: {
      color: colors.textPrimary,
      fontSize: theme.typography.meta,
      fontWeight: '600',
      marginBottom: theme.spacing[8],
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.radius.small,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: theme.spacing[12],
      paddingVertical: theme.spacing[12],
      fontSize: theme.typography.body,
    },
    primaryButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: theme.radius.small,
      backgroundColor: colors.accent,
      paddingHorizontal: theme.spacing[16],
      paddingVertical: theme.spacing[12],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: colors.surface,
      fontSize: theme.typography.body,
      fontWeight: '600',
    },
    secondaryActionGroup: {
      marginTop: theme.spacing[16],
      gap: theme.spacing[12],
    },
    linkText: {
      color: colors.accent,
      fontSize: theme.typography.body,
      textDecorationLine: 'underline',
    },
    messageBox: {
      marginTop: theme.spacing[16],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.radius.medium,
      backgroundColor: colors.accentSoft,
      padding: theme.spacing[12],
    },
    messageText: {
      color: colors.textPrimary,
      fontSize: theme.typography.body,
      lineHeight: 22,
    },
  });
}

const authUiStylesByTheme = {
  light: buildAuthUiStyles('light'),
  dark: buildAuthUiStyles('dark'),
} as const;

type AuthUiStyles = typeof authUiStylesByTheme.light;

export const authUiStyles = new Proxy({} as AuthUiStyles, {
  get(_target, prop) {
    return authUiStylesByTheme[getActiveThemeMode()][prop as keyof AuthUiStyles];
  },
});
