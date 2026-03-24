import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { useAuthUiStyles } from '@/src/theme/auth-ui';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function IndexScreen() {
  const { theme } = useAppTheme();
  const authUiStyles = useAuthUiStyles();
  const contentContainerStyle = useBottomSafeContentStyle(authUiStyles.scrollContent);

  return (
    <ScrollView
      style={authUiStyles.scroll}
      contentContainerStyle={[
        contentContainerStyle,
        { justifyContent: 'center' },
      ]}>
      <View style={authUiStyles.formWrap}>
        <View style={authUiStyles.card}>
          <View
            style={[
              authUiStyles.header,
              {
                alignItems: 'center',
                marginBottom: theme.spacing[24],
              },
            ]}>
            <Image
              source={require('../assets/icon.png')}
              style={{
                width: 88,
                height: 88,
                borderRadius: 20,
                marginBottom: theme.spacing[8],
              }}
              resizeMode="contain"
            />
          </View>

          <View style={{ gap: theme.spacing[12] }}>
            <Link href="/login" asChild>
              <Pressable style={authUiStyles.primaryButton}>
                <Text style={authUiStyles.primaryButtonText}>Anmelden</Text>
              </Pressable>
            </Link>

            <Link href="/register" asChild>
              <Pressable style={authUiStyles.primaryButton}>
                <Text style={authUiStyles.primaryButtonText}>Registrieren</Text>
              </Pressable>
            </Link>
          </View>

          <View style={{ marginTop: theme.spacing[16], alignItems: 'flex-start' }}>
            <Link href="/forgot-password" asChild>
              <Pressable>
                <Text style={authUiStyles.linkText}>Passwort vergessen</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
