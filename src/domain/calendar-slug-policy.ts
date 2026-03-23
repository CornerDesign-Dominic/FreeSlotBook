function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export function normalizeExistingUsername(username: unknown) {
  return typeof username === 'string' && username.trim().length ? normalizeUsername(username) : '';
}

export function normalizeExistingCalendarSlug(slug: unknown) {
  return typeof slug === 'string' && slug.trim().length ? normalizeSlug(slug) : '';
}

export function resolveStableCalendarSlug(params: {
  currentCalendarSlug?: string | null;
  requestedCalendarSlug?: string | null;
}) {
  const currentSlug = normalizeExistingCalendarSlug(params.currentCalendarSlug);
  const requestedSlug = normalizeExistingCalendarSlug(params.requestedCalendarSlug);

  if (currentSlug && requestedSlug && currentSlug !== requestedSlug) {
    throw new Error('Der bestehende Kalender-Link ist fest vergeben und kann aktuell nicht geaendert werden.');
  }

  return requestedSlug || currentSlug || null;
}
