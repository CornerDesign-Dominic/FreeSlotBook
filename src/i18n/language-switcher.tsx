import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/src/i18n/provider';
import type { Language } from './types';

function LanguageButton(props: {
  language: Language;
  currentLanguage: Language;
  onPress: (language: Language) => void;
  label: string;
}) {
  const isActive = props.language === props.currentLanguage;

  return (
    <Pressable
      onPress={() => props.onPress(props.language)}
      style={{
        borderWidth: 1,
        borderColor: 'black',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: isActive ? '#f1f1f1' : 'white',
      }}>
      <Text style={{ color: 'black' }}>{props.label}</Text>
    </Pressable>
  );
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
      }}>
      <Text style={{ color: 'black' }}>{t('common.language')}</Text>
      <LanguageButton language="de" currentLanguage={language} onPress={setLanguage} label="DE" />
      <LanguageButton language="en" currentLanguage={language} onPress={setLanguage} label="EN" />
    </View>
  );
}
