import type { SubscriptionTier } from './types';

export type SubscriptionLimits = {
  maxCalendars: number | null;
  maxPublicCalendars: number | null;
  maxWhitelistPerCalendar: number | null;
};

export type SubscriptionPolicyResult = {
  allowed: boolean;
  reason: string | null;
  limits: SubscriptionLimits;
};

const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxCalendars: 1,
    maxPublicCalendars: 0,
    maxWhitelistPerCalendar: 25,
  },
  plus: {
    maxCalendars: 5,
    maxPublicCalendars: 0,
    maxWhitelistPerCalendar: 250,
  },
  pro: {
    maxCalendars: null,
    maxPublicCalendars: 1,
    maxWhitelistPerCalendar: 1000,
  },
};

export function isUnlimited(value: number | null) {
  return value === null;
}

export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier];
}

export function canCreateAnotherCalendar(params: {
  tier: SubscriptionTier;
  currentCalendarCount: number;
}): SubscriptionPolicyResult {
  const limits = getSubscriptionLimits(params.tier);

  if (isUnlimited(limits.maxCalendars) || params.currentCalendarCount < limits.maxCalendars) {
    return { allowed: true, reason: null, limits };
  }

  if (params.tier === 'free') {
    return {
      allowed: false,
      reason: 'Im Free-Tarif kannst du nur einen privaten Kalender anlegen.',
      limits,
    };
  }

  return {
    allowed: false,
    reason: 'Im Plus-Tarif kannst du maximal 5 Kalender anlegen.',
    limits,
  };
}

export function canEnablePublicCalendar(params: {
  tier: SubscriptionTier;
  currentPublicCalendarCount: number;
  isAlreadyPublic?: boolean;
}): SubscriptionPolicyResult {
  const limits = getSubscriptionLimits(params.tier);

  if (params.isAlreadyPublic || isUnlimited(limits.maxPublicCalendars)) {
    return { allowed: true, reason: null, limits };
  }

  if (params.currentPublicCalendarCount < limits.maxPublicCalendars) {
    return { allowed: true, reason: null, limits };
  }

  if (limits.maxPublicCalendars === 0) {
    return {
      allowed: false,
      reason: 'Dein aktueller Tarif erlaubt keine öffentlichen Kalender.',
      limits,
    };
  }

  return {
    allowed: false,
    reason: 'In deinem aktuellen Tarif ist maximal ein öffentlicher Kalender möglich.',
    limits,
  };
}

export function canAddWhitelistEntry(params: {
  tier: SubscriptionTier;
  currentWhitelistCount: number;
  isAlreadyReserved?: boolean;
}): SubscriptionPolicyResult {
  const limits = getSubscriptionLimits(params.tier);

  if (params.isAlreadyReserved || isUnlimited(limits.maxWhitelistPerCalendar)) {
    return { allowed: true, reason: null, limits };
  }

  if (params.currentWhitelistCount < limits.maxWhitelistPerCalendar) {
    return { allowed: true, reason: null, limits };
  }

  return {
    allowed: false,
    reason: 'Das Whitelist-Limit dieses Kalenders ist erreicht.',
    limits,
  };
}
