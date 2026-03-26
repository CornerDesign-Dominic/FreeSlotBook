import {
  Timestamp,
  collection,
  doc,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';

import type {
  AppointmentRecord,
  AppointmentCalendarSettings,
  CalendarAccessRecord,
  CalendarAccessRequestRecord,
  CalendarInviteRecord,
  CalendarRecord,
  CalendarSlotEventRecord,
  CalendarSlotRecord,
  NotificationRecord,
  OwnerProfile,
} from './types';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.trim();
}

export function validateOptionalPhoneNumber(phoneNumber?: string | null) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber ?? '');

  if (!normalizedPhoneNumber) {
    return null;
  }

  if (!/^[+\d\s()/.-]{6,20}$/.test(normalizedPhoneNumber)) {
    throw new Error('Bitte gib eine gültige Telefonnummer ein oder lasse das Feld leer.');
  }

  if (normalizedPhoneNumber.replace(/\D/g, '').length < 6) {
    throw new Error('Bitte gib eine gültige Telefonnummer ein oder lasse das Feld leer.');
  }

  return normalizedPhoneNumber;
}

export function getFirestoreErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }

  return null;
}

export function isMissingFirestoreIndexError(error: unknown) {
  const message = getFirestoreErrorMessage(error)?.toLowerCase() ?? '';
  return message.includes('requires an index');
}

export function getDashboardLoadErrorMessage(error: unknown) {
  if (isMissingFirestoreIndexError(error)) {
    return 'Für diese Ansicht fehlt noch ein Firestore-Index.';
  }

  return getFirestoreErrorMessage(error) ?? 'Das Dashboard konnte nicht geladen werden.';
}

export function getAppointmentLoadErrorMessage(error: unknown) {
  if (isMissingFirestoreIndexError(error)) {
  return 'Der Termin-Kalender ist gerade nicht verfügbar.';
  }

  return getFirestoreErrorMessage(error) ?? 'Termine konnten nicht geladen werden.';
}

export function getProfileLoadErrorMessage(error: unknown) {
  if (isMissingFirestoreIndexError(error)) {
    return 'Das Profil konnte gerade nicht vollständig geladen werden.';
  }

  return getFirestoreErrorMessage(error) ?? 'Das Profil konnte nicht geladen werden.';
}

export function asDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

export function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export function usernameDoc(username: string) {
  return doc(db, 'usernames', username);
}

export function emailDoc(emailKey: string) {
  return doc(db, 'emails', emailKey);
}

export function calendarDoc(calendarId: string) {
  return doc(db, 'calendars', calendarId);
}

export function calendarSlugDoc(slug: string) {
  return doc(db, 'calendarSlugs', slug);
}

export function notificationCollection() {
  return collection(db, 'notifications');
}

export function notificationDoc(notificationId: string) {
  return doc(db, 'notifications', notificationId);
}

export function calendarAccessCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'access');
}

export function calendarAccessDoc(calendarId: string, uid: string) {
  return doc(db, 'calendars', calendarId, 'access', uid);
}

export function calendarInvitesCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'invites');
}

export function calendarInviteDoc(calendarId: string, invitedUid: string) {
  return doc(db, 'calendars', calendarId, 'invites', invitedUid);
}

export function calendarAccessRequestsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'accessRequests');
}

export function calendarAccessRequestDoc(calendarId: string, uid: string) {
  return doc(db, 'calendars', calendarId, 'accessRequests', uid);
}

export function calendarSlotsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'slots');
}

export function calendarSlotDoc(calendarId: string, slotId: string) {
  return doc(db, 'calendars', calendarId, 'slots', slotId);
}

export function slotEventsCollection(calendarId: string, slotId: string) {
  return collection(db, 'calendars', calendarId, 'slots', slotId, 'events');
}

export function calendarAppointmentsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'appointments');
}

export function userDevicesCollection(uid: string) {
  return collection(db, 'users', uid, 'devices');
}

export function userConnectedCalendarPreferencesCollection(uid: string) {
  return collection(db, 'users', uid, 'connectedCalendarPreferences');
}

export function userConnectedCalendarPreferenceDoc(uid: string, calendarId: string) {
  return doc(db, 'users', uid, 'connectedCalendarPreferences', calendarId);
}

export function userSettingsDoc(uid: string, settingId: string) {
  return doc(db, 'users', uid, 'settings', settingId);
}

export function appointmentCalendarSettingsDoc(uid: string) {
  return userSettingsDoc(uid, 'appointmentCalendar');
}

export const reservedPublicSlugs = new Set([
  'login',
  'register',
  'agb',
  'datenschutz',
  'settings',
  'calendar',
  'user',
  'request-calendar-access',
  'forgot-password',
  'shared-calendar',
  'slots',
  'public-calendar',
  'api',
  'admin',
]);

export function mapOwnerProfile(id: string, data: Record<string, unknown>): OwnerProfile {
  const username =
    typeof data.username === 'string' && data.username.trim().length ? data.username.trim() : null;

  return {
    uid: String(data.uid ?? id),
    email: String(data.email ?? ''),
    emailKey: String(data.emailKey ?? ''),
    username,
    slotlymeId: username,
    defaultCalendarId:
      typeof data.defaultCalendarId === 'string' && data.defaultCalendarId.trim().length
        ? data.defaultCalendarId
        : null,
    subscriptionTier:
      data.subscriptionTier === 'pro' ? 'pro' : data.subscriptionTier === 'plus' ? 'plus' : 'free',
    primaryIdentityType: 'email',
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export function mapCalendar(id: string, data: Record<string, unknown>): CalendarRecord {
  const ownerUid = String(data.ownerUid ?? data.ownerId ?? '');
  const calendarSlug =
    typeof data.calendarSlug === 'string' && data.calendarSlug.trim().length
      ? data.calendarSlug.trim()
      : null;

  return {
    id,
    ownerUid,
    ownerId: ownerUid,
    ownerEmail: String(data.ownerEmail ?? ''),
    ownerUsername:
      typeof data.ownerUsername === 'string' && data.ownerUsername.trim().length
        ? data.ownerUsername.trim()
        : null,
    title:
      typeof data.title === 'string' && data.title.trim().length ? data.title.trim() : 'Mein Kalender',
    visibility: data.visibility === 'public' ? 'public' : 'private',
    calendarSlug,
    publicSlug: calendarSlug,
    description:
      typeof data.description === 'string' && data.description.trim().length
        ? data.description.trim()
        : null,
    notifyOnNewSlotsAvailable: Boolean(data.notifyOnNewSlotsAvailable),
    isArchived: Boolean(data.isArchived),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export function mapAccess(id: string, data: Record<string, unknown>): CalendarAccessRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    uid: String(data.uid ?? id),
    role: data.role === 'owner' ? 'owner' : 'member',
    email: String(data.email ?? ''),
    username:
      typeof data.username === 'string' && data.username.trim().length
        ? data.username.trim()
        : null,
    displayName:
      typeof data.displayName === 'string' && data.displayName.trim().length
        ? data.displayName.trim()
        : null,
    addedAt: asDate(data.addedAt ?? data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export function mapInvite(id: string, data: Record<string, unknown>): CalendarInviteRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    invitedUid: String(data.invitedUid ?? id),
    invitedEmail: String(data.invitedEmail ?? ''),
    invitedUsername:
      typeof data.invitedUsername === 'string' && data.invitedUsername.trim().length
        ? data.invitedUsername.trim()
        : null,
    invitedByUid: String(data.invitedByUid ?? ''),
    status: data.status === 'accepted' ? 'accepted' : data.status === 'rejected' ? 'rejected' : 'pending',
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    respondedAt: asDate(data.respondedAt),
  };
}

export function mapAccessRequest(id: string, data: Record<string, unknown>): CalendarAccessRequestRecord {
  const requesterUid = String(data.requesterUid ?? data.uid ?? id);

  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    calendarSlug:
      typeof data.calendarSlug === 'string' && data.calendarSlug.trim().length
        ? data.calendarSlug.trim()
        : null,
    requesterUid,
    requesterEmail: String(data.requesterEmail ?? ''),
    requesterUsername:
      typeof data.requesterUsername === 'string' && data.requesterUsername.trim().length
        ? data.requesterUsername.trim()
        : null,
    status:
      data.status === 'approved'
        ? 'approved'
        : data.status === 'rejected'
          ? 'rejected'
          : data.status === 'cancelled'
            ? 'cancelled'
            : 'pending',
    createdAt: asDate(data.createdAt ?? data.requestedAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export function mapSlot(id: string, data: Record<string, unknown>): CalendarSlotRecord {
  const ownerUid = String(data.ownerUid ?? data.ownerId ?? '');

  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    ownerUid,
    ownerId: ownerUid,
    startsAt: asDate(data.startsAt),
    endsAt: asDate(data.endsAt),
    status: data.status === 'booked' ? 'booked' : data.status === 'inactive' ? 'inactive' : 'available',
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export function mapSlotEvent(id: string, data: Record<string, unknown>): CalendarSlotEventRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    slotId: String(data.slotId ?? ''),
    type:
      data.type === 'edited' ||
      data.type === 'booked' ||
      data.type === 'assigned_by_owner' ||
      data.type === 'set_inactive' ||
      data.type === 'cancelled_by_owner' ||
      data.type === 'reactivated'
        ? data.type
        : 'created',
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : null,
    actorRole:
      data.actorRole === 'member' || data.actorRole === 'guest' || data.actorRole === 'system'
        ? data.actorRole
        : 'owner',
    targetEmail: typeof data.targetEmail === 'string' ? data.targetEmail : null,
    targetUid: typeof data.targetUid === 'string' ? data.targetUid : null,
    statusAfter:
      data.statusAfter === 'booked' || data.statusAfter === 'inactive' || data.statusAfter === 'available'
        ? data.statusAfter
        : null,
    note: typeof data.note === 'string' ? data.note : null,
    createdAt: asDate(data.createdAt),
  };
}

export function mapAppointment(id: string, data: Record<string, unknown>): AppointmentRecord {
  const ownerUid = String(data.ownerUid ?? data.ownerId ?? '');

  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    slotId: typeof data.slotId === 'string' ? data.slotId : null,
    ownerUid,
    ownerId: ownerUid,
    bookedByUserId: typeof data.bookedByUserId === 'string' ? data.bookedByUserId : null,
    participantUid: typeof data.participantUid === 'string' ? data.participantUid : null,
    participantName: typeof data.participantName === 'string' ? data.participantName : null,
    participantPhone: typeof data.participantPhone === 'string' ? data.participantPhone : null,
    bookedByEmail: String(data.bookedByEmail ?? ''),
    bookedByEmailKey: String(data.bookedByEmailKey ?? ''),
    participantEmail: String(data.participantEmail ?? ''),
    participantEmailKey: String(data.participantEmailKey ?? ''),
    guestBooking: Boolean(data.guestBooking),
    accountCreationRequested: Boolean(data.accountCreationRequested),
    termsAccepted: Boolean(data.termsAccepted),
    termsAcceptedAt: asDate(data.termsAcceptedAt),
    termsVersion: typeof data.termsVersion === 'string' ? data.termsVersion : null,
    privacyAccepted: Boolean(data.privacyAccepted),
    privacyAcceptedAt: asDate(data.privacyAcceptedAt),
    privacyVersion: typeof data.privacyVersion === 'string' ? data.privacyVersion : null,
    startsAt: asDate(data.startsAt),
    endsAt: asDate(data.endsAt),
    source: data.source === 'manual' ? 'manual' : 'self_service',
    status: data.status === 'cancelled' ? 'cancelled' : 'booked',
    createdByUserId: typeof data.createdByUserId === 'string' ? data.createdByUserId : null,
    cancelledByUserId: typeof data.cancelledByUserId === 'string' ? data.cancelledByUserId : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    cancelledAt: asDate(data.cancelledAt),
  };
}

export function mapAppointmentCalendarSettings(
  data: Record<string, unknown> | null | undefined
): AppointmentCalendarSettings {
  return {
    hiddenCalendarIds: Array.isArray(data?.hiddenCalendarIds)
      ? data!.hiddenCalendarIds.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : [],
  };
}

export function mapNotification(id: string, data: Record<string, unknown>): NotificationRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    slotId: typeof data.slotId === 'string' ? data.slotId : null,
    recipientUid: typeof data.recipientUid === 'string' ? data.recipientUid : null,
    recipientEmail: String(data.recipientEmail ?? ''),
    recipientEmailKey: String(data.recipientEmailKey ?? ''),
    channel: data.channel === 'email' || data.channel === 'push' ? data.channel : 'in_app',
    type:
      data.type === 'slot_assigned' ||
      data.type === 'slot_cancelled' ||
      data.type === 'new_slots_available' ||
      data.type === 'booking_confirmation' ||
      data.type === 'account_creation_invite' ||
      data.type === 'appointment_assigned' ||
      data.type === 'appointment_cancelled'
        ? data.type
        : 'booking_created',
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    dedupeKey: typeof data.dedupeKey === 'string' ? data.dedupeKey : null,
    status:
      data.status === 'processing' || data.status === 'sent' || data.status === 'failed' || data.status === 'read'
        ? data.status
        : 'pending',
    deliveryError: typeof data.deliveryError === 'string' ? data.deliveryError : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    readAt: asDate(data.readAt),
  };
}

export function buildNotificationContent(params: {
  type: NotificationRecord['type'];
  ownerEmail?: string;
  startsAt?: Date | null;
}) {
  const ownerLabel = params.ownerEmail ?? 'Kalender';
  const dateTimeLabel =
    params.startsAt?.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
  }) ?? 'Zeitpunkt nicht verfügbar';

  switch (params.type) {
    case 'slot_assigned':
      return { title: 'Slot erhalten', body: `Slotzeit am ${dateTimeLabel} erhalten` };
    case 'slot_cancelled':
      return { title: 'Termin storniert', body: `Termin bei ${ownerLabel} storniert` };
    case 'new_slots_available':
      return { title: 'Neue freie Slots', body: `Neue freie Slots bei ${ownerLabel}` };
    case 'appointment_assigned':
      return { title: 'Termin erhalten', body: `Termin am ${dateTimeLabel} erhalten` };
    case 'appointment_cancelled':
      return { title: 'Termin storniert', body: `Termin bei ${ownerLabel} storniert` };
    case 'booking_confirmation':
    return { title: 'Buchung bestätigt', body: `Deine Buchung am ${dateTimeLabel} wurde gespeichert` };
    case 'account_creation_invite':
    return { title: 'Konto vorbereiten', body: `Bestätige deine E-Mail für ein späteres Konto bei ${ownerLabel}` };
    default:
      return { title: 'Neue Buchung', body: `${ownerLabel} hat eine neue Buchung erhalten` };
  }
}
