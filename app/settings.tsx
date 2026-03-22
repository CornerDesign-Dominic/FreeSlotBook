import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '../src/components/app-screen-header';
import { LanguageSwitcher } from '../src/i18n/language-switcher';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import type { AppTheme, WeekStartsOn } from '../src/settings/types';
import { useAppTheme, useBottomSafeContentStyle } from '../src/theme/ui';

function ChoiceButton(props: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { uiStyles } = useAppTheme();

  return (
    <Pressable
      onPress={props.onPress}
      style={[uiStyles.button, props.active ? uiStyles.buttonActive : null]}>
      <Text style={uiStyles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme: designTheme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { theme, setTheme, weekStartsOn, setWeekStartsOn } = useAppSettings();

  const handleSetTheme = async (nextTheme: AppTheme) => {
    await setTheme(nextTheme);
  };

  const handleSetWeekStartsOn = async (nextWeekStartsOn: WeekStartsOn) => {
    await setWeekStartsOn(nextWeekStartsOn);
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('settings.title')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.language')}</Text>
        <LanguageSwitcher />
      </View>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.weekStart')}</Text>
        <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[12] }]}>{t('settings.weekStartHelp')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ChoiceButton
            label={t('settings.weekStartMonday')}
            active={weekStartsOn === 'monday'}
            onPress={() => handleSetWeekStartsOn('monday')}
          />
          <ChoiceButton
            label={t('settings.weekStartSunday')}
            active={weekStartsOn === 'sunday'}
            onPress={() => handleSetWeekStartsOn('sunday')}
          />
        </View>
      </View>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.theme')}</Text>
        <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[12] }]}>{t('settings.themeHelp')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ChoiceButton
            label={t('settings.themeLight')}
            active={theme === 'light'}
            onPress={() => handleSetTheme('light')}
          />
          <ChoiceButton
            label={t('settings.themeDark')}
            active={theme === 'dark'}
            onPress={() => handleSetTheme('dark')}
          />
        </View>
      </View>
    </ScrollView>
  );
}
