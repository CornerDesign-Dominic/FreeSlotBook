import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useOptionalAppSettings } from '@/src/settings/provider';

export function useColorScheme() {
  const systemColorScheme = useSystemColorScheme();
  const settings = useOptionalAppSettings();

  if (settings?.theme) {
    return settings.theme;
  }

  return systemColorScheme;
}
