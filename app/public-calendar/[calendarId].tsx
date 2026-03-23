import { useLocalSearchParams } from 'expo-router';

import { PublicCalendarScreenContent } from '../../src/domain/public-calendar-screen';

export default function PublicCalendarByIdScreen() {
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId ?? null;

  return (
    <PublicCalendarScreenContent
      calendarId={calendarId}
      currentPublicPath={calendarId ? `/public-calendar/${calendarId}` : '/public-calendar'}
    />
  );
}
