import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PublicSlugScreen() {
  const params = useLocalSearchParams<{ publicSlug?: string | string[] }>();
  const publicSlug = Array.isArray(params.publicSlug) ? params.publicSlug[0] : params.publicSlug ?? '';
  return <Redirect href={`/calendar/${publicSlug}`} />;
}
