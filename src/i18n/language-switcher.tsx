import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme } from '@/src/theme/ui';
import type { Language } from './types';

function LanguageButton(props: {
  language: Language;
  currentLanguage: Language;
  onPress: (language: Language) => void;
  label: string;
}) {
  const isActive = props.language === props.currentLanguage;
  const { uiStyles } = useAppTheme();

  return (
    <Pressable
      onPress={() => props.onPress(props.language)}
      style={[uiStyles.button, isActive ? uiStyles.buttonActive : null]}>
      <Text style={uiStyles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
      }}>
      <LanguageButton language="de" currentLanguage={language} onPress={setLanguage} label="DE" />
      <LanguageButton language="en" currentLanguage={language} onPress={setLanguage} label="EN" />
    </View>
  );
}
