import { StyleSheet } from 'react-native';

import { theme } from './ui';

export const authUiStyles = StyleSheet.create({
  keyboardShell: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    padding: theme.spacing[20],
    ...theme.shadow.soft,
  },
  header: {
    marginBottom: theme.spacing[20],
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: theme.spacing[8],
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    lineHeight: 22,
  },
  fieldGroup: {
    marginBottom: theme.spacing[16],
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.meta,
    fontWeight: '600',
    marginBottom: theme.spacing[8],
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    fontSize: theme.typography.body,
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.accent,
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
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '600',
  },
  secondaryActionGroup: {
    marginTop: theme.spacing[16],
    gap: theme.spacing[12],
  },
  linkText: {
    color: theme.colors.accent,
    fontSize: theme.typography.body,
    textDecorationLine: 'underline',
  },
  messageBox: {
    marginTop: theme.spacing[16],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.accentSoft,
    padding: theme.spacing[12],
  },
  messageText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body,
    lineHeight: 22,
  },
});
