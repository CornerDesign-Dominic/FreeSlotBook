import { describe, expect, test } from 'vitest';

import { resolveStableCalendarSlug } from '../../src/domain/calendar-slug-policy';

describe('calendar slug bugfix guards', () => {
  test('ensureOwnerAccountSetup keeps an existing slug when no new slotlymeId is provided', () => {
    const resolvedSlug = resolveStableCalendarSlug({
      currentCalendarSlug: 'owneruser',
      requestedCalendarSlug: null,
    });

    expect(resolvedSlug).toBe('owneruser');
  });

  test('changing an existing calendar slug to a different slug is blocked', () => {
    expect(() =>
      resolveStableCalendarSlug({
        currentCalendarSlug: 'owneruser',
        requestedCalendarSlug: 'other-slug',
      })
    ).toThrow('fest vergeben');
  });

  test('first-time slug assignment still works', () => {
    const resolvedSlug = resolveStableCalendarSlug({
      currentCalendarSlug: null,
      requestedCalendarSlug: 'first-slug',
    });

    expect(resolvedSlug).toBe('first-slug');
  });
});
