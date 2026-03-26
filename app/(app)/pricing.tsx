import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { updateUserSubscriptionTier } from '@/src/domain/repository';
import type { SubscriptionTier } from '@/src/domain/types';
import { invalidateOwnerProfile, useOwnerProfile } from '@/src/domain/useOwnerProfile';
import { useAuth } from '@/src/firebase/useAuth';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

type PlanDefinition = {
  tier: SubscriptionTier;
  title: string;
  details: [string, string, string];
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    tier: 'free',
    title: 'Free',
    details: ['1 Kalender', '25er MemberList', '0 public Kalender'],
  },
  {
    tier: 'plus',
    title: 'Plus',
    details: ['5 Kalender', '250er MemberList', '0 public Kalender'],
  },
  {
    tier: 'pro',
    title: 'Pro',
    details: ['unlimited Kalender', '1000er MemberList', '1 public Kalender'],
  },
];

export default function PricingScreen() {
  const { user, loading: authLoading } = useAuth();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUpdatingTier, setIsUpdatingTier] = useState<SubscriptionTier | null>(null);
  const authUser = user ? { uid: user.uid, email: user.email } : null;
  const { profile, loading: profileLoading, error } = useOwnerProfile(authUser, refreshKey);
  const activeTier = profile?.subscriptionTier ?? 'free';

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (!user || isUpdatingTier || tier === activeTier) {
      return;
    }

    Alert.alert(
      `Auf ${PLAN_DEFINITIONS.find((plan) => plan.tier === tier)?.title ?? tier} wechseln?`,
      'Später wird hier an dieser Stelle das Google-Payment eingebunden.',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Bestätigen',
          onPress: () => {
            void (async () => {
              setIsUpdatingTier(tier);

              try {
                await updateUserSubscriptionTier({
                  uid: user.uid,
                  subscriptionTier: tier,
                });
                invalidateOwnerProfile();
                setRefreshKey((currentValue) => currentValue + 1);
              } catch (nextError) {
                Alert.alert(
                  'Planwechsel fehlgeschlagen',
                  nextError instanceof Error
                    ? nextError.message
                    : 'Der Plan konnte gerade nicht aktualisiert werden.'
                );
              } finally {
                setIsUpdatingTier(null);
              }
            })();
          },
        },
      ]
    );
  };

  if (authLoading || profileLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>Lade Pricing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Pricing" />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.secondaryText, { marginBottom: error ? theme.spacing[8] : 0 }]}>
          Teste hier die drei vorhandenen Subscription-Tiers direkt in der App.
        </Text>
        {error ? <Text style={uiStyles.secondaryText}>{error}</Text> : null}
      </View>

      {PLAN_DEFINITIONS.map((plan) => {
        const isActive = plan.tier === activeTier;
        const isPending = isUpdatingTier === plan.tier;

        return (
          <Pressable
            key={plan.tier}
            onPress={() => handleSelectTier(plan.tier)}
            disabled={isActive || Boolean(isUpdatingTier)}
            style={[
              uiStyles.panel,
              isActive
                ? {
                    borderColor: theme.colors.accent,
                    backgroundColor: theme.colors.accentSoft,
                  }
                : null,
              !isActive && isUpdatingTier ? { opacity: 0.7 } : null,
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing[12],
                marginBottom: theme.spacing[12],
              }}>
              <Text style={uiStyles.sectionTitle}>{plan.title}</Text>
              <Text
                style={[
                  uiStyles.metaText,
                  isActive ? { color: theme.colors.accent, fontWeight: '700' } : null,
                ]}>
                {isActive ? 'Aktiver Plan' : isPending ? 'Wechselt...' : 'Auswählen'}
              </Text>
            </View>

            {plan.details.map((detail) => (
              <Text
                key={detail}
                style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
                {detail}
              </Text>
            ))}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
