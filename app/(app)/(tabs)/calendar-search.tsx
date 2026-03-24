import { useLocalSearchParams } from 'expo-router';

import { CalendarSearchScreen } from '@/src/domain/calendar-search-screen';

export default function CalendarSearchRoute() {
  const params = useLocalSearchParams<{ calendarSlug?: string | string[] }>();
  const initialCalendarSlug =
    typeof params.calendarSlug === 'string'
      ? params.calendarSlug
      : Array.isArray(params.calendarSlug)
        ? params.calendarSlug[0] ?? ''
        : '';

  return <CalendarSearchScreen initialCalendarSlug={initialCalendarSlug} />;
}
