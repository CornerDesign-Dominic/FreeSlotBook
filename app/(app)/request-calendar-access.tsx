import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RequestCalendarAccessScreen() {
  const params = useLocalSearchParams<{ calendarSlug?: string | string[] }>();
  const calendarSlug =
    typeof params.calendarSlug === 'string'
      ? params.calendarSlug
      : Array.isArray(params.calendarSlug)
        ? params.calendarSlug[0]
        : undefined;

  return (
    <Redirect
      href={{
        pathname: '/calendar-search',
        params: calendarSlug ? { calendarSlug } : undefined,
      }}
    />
  );
}
