import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { getDayKey } from '../../src/domain/calendar-utils';
import { useOwnerCalendar } from '../../src/domain/useOwnerCalendar';
import { useOwnerSlotDetail } from '../../src/domain/useOwnerSlotDetail';
import { useAuth } from '../../src/firebase/useAuth';

export default function SlotDetailRedirectScreen() {
  const params = useLocalSearchParams<{ slotId?: string | string[] }>();
  const slotId = Array.isArray(params.slotId) ? params.slotId[0] : params.slotId ?? null;
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading: calendarLoading } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slot, loading, error } = useOwnerSlotDetail(calendar?.id ?? null, slotId);

  useEffect(() => {
    if (!slot?.startsAt || !slotId) {
      return;
    }

    router.replace(`/my-calendar/${getDayKey(slot.startsAt)}?slotId=${slotId}`);
  }, [slot, slotId]);

  if (authLoading || calendarLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: 'black' }}>Weiterleitung zur Tagesansicht...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', padding: 16 }}>
      <Text style={{ color: 'black', marginBottom: 8 }}>
        {error ?? 'Dieser Slot konnte nicht geladen werden.'}
      </Text>
      <Text style={{ color: 'black' }}>
        Die Tagesansicht ist jetzt die zentrale Ansicht für Slots und Verlauf.
      </Text>
    </View>
  );
}
