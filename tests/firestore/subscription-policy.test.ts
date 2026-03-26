import { describe, expect, test } from 'vitest';

import {
  canAddWhitelistEntry,
  canCreateAnotherCalendar,
  canEnablePublicCalendar,
  getSubscriptionLimits,
  isUnlimited,
} from '../../src/domain/subscription-policy';

describe('Subscription policy', () => {
  test('new limits are exposed centrally for all three tiers', () => {
    expect(getSubscriptionLimits('free')).toEqual({
      maxCalendars: 1,
      maxPublicCalendars: 0,
      maxWhitelistPerCalendar: 25,
    });
    expect(getSubscriptionLimits('plus')).toEqual({
      maxCalendars: 5,
      maxPublicCalendars: 1,
      maxWhitelistPerCalendar: 200,
    });
    expect(getSubscriptionLimits('pro')).toEqual({
      maxCalendars: null,
      maxPublicCalendars: null,
      maxWhitelistPerCalendar: 1000,
    });
    expect(isUnlimited(getSubscriptionLimits('pro').maxCalendars)).toBe(true);
  });

  test('free can not create a second calendar', () => {
    expect(canCreateAnotherCalendar({ tier: 'free', currentCalendarCount: 0 }).allowed).toBe(true);
    expect(canCreateAnotherCalendar({ tier: 'free', currentCalendarCount: 1 })).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: 'Im Free-Tarif kannst du nur einen privaten Kalender anlegen.',
      })
    );
  });

  test('plus can create up to five calendars, but not a sixth', () => {
    expect(canCreateAnotherCalendar({ tier: 'plus', currentCalendarCount: 4 }).allowed).toBe(true);
    expect(canCreateAnotherCalendar({ tier: 'plus', currentCalendarCount: 5 })).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: 'Im Plus-Tarif kannst du maximal 5 Kalender anlegen.',
      })
    );
  });

  test('public calendar limits match the requested product rules', () => {
    expect(
      canEnablePublicCalendar({ tier: 'free', currentPublicCalendarCount: 0, isAlreadyPublic: false })
    ).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: 'Dein aktueller Tarif erlaubt keine öffentlichen Kalender.',
      })
    );
    expect(
      canEnablePublicCalendar({ tier: 'plus', currentPublicCalendarCount: 0, isAlreadyPublic: false }).allowed
    ).toBe(true);
    expect(
      canEnablePublicCalendar({ tier: 'plus', currentPublicCalendarCount: 1, isAlreadyPublic: false })
    ).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: 'Im Plus-Tarif ist maximal ein öffentlicher Kalender möglich.',
      })
    );
    expect(
      canEnablePublicCalendar({ tier: 'pro', currentPublicCalendarCount: 12, isAlreadyPublic: false }).allowed
    ).toBe(true);
  });

  test('whitelist limits are enforced per calendar', () => {
    expect(canAddWhitelistEntry({ tier: 'free', currentWhitelistCount: 24 }).allowed).toBe(true);
    expect(canAddWhitelistEntry({ tier: 'free', currentWhitelistCount: 25 }).allowed).toBe(false);
    expect(canAddWhitelistEntry({ tier: 'plus', currentWhitelistCount: 199 }).allowed).toBe(true);
    expect(canAddWhitelistEntry({ tier: 'plus', currentWhitelistCount: 200 }).allowed).toBe(false);
    expect(canAddWhitelistEntry({ tier: 'pro', currentWhitelistCount: 999 }).allowed).toBe(true);
    expect(canAddWhitelistEntry({ tier: 'pro', currentWhitelistCount: 1000 }).allowed).toBe(false);
  });

  test('downgrades do not delete anything, but further limit increases stay blocked', () => {
    expect(canCreateAnotherCalendar({ tier: 'free', currentCalendarCount: 5 }).allowed).toBe(false);
    expect(
      canEnablePublicCalendar({ tier: 'free', currentPublicCalendarCount: 2, isAlreadyPublic: false }).allowed
    ).toBe(false);
    expect(canAddWhitelistEntry({ tier: 'free', currentWhitelistCount: 25 }).allowed).toBe(false);
  });
});
