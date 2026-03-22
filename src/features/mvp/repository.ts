import {
  Timestamp,
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';

import { findOverlappingSlots } from './calendar-utils';
import { PRIVACY_VERSION, TERMS_VERSION } from './types';
import type {
  AppointmentRecord,
  CalendarAccessRecord,
  CalendarAccessRequestRecord,
  CalendarSlotEventRecord,
  CalendarSlotRecord,
  CalendarRecord,
  DashboardData,
  NotificationRecord,
  OwnerProfile,
} from './types';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.trim();
}

function validateOptionalPhoneNumber(phoneNumber?: string | null) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber ?? '');

  if (!normalizedPhoneNumber) {
    return null;
  }

  if (!/^[+\d\s()/.-]{6,20}$/.test(normalizedPhoneNumber)) {
    throw new Error('Bitte gib eine gueltige Telefonnummer ein oder lasse das Feld leer.');
  }

  const digitsCount = normalizedPhoneNumber.replace(/\D/g, '').length;

  if (digitsCount < 6) {
    throw new Error('Bitte gib eine gueltige Telefonnummer ein oder lasse das Feld leer.');
  }

  return normalizedPhoneNumber;
}

function getFirestoreErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }

  return null;
}

function isMissingFirestoreIndexError(error: unknown) {
  const message = getFirestoreErrorMessage(error)?.toLowerCase() ?? '';

  return message.includes('requires an index');
}

function getDashboardLoadErrorMessage(error: unknown) {
  if (isMissingFirestoreIndexError(error)) {
    return 'Für diese Ansicht fehlt noch ein Firestore-Index.';
  }

  return getFirestoreErrorMessage(error) ?? 'Das Dashboard konnte nicht geladen werden.';
}

function resolveNormalizedEmailKey(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return normalizeEmail(value);
}

function resolveAccessEmailKey(id: string, data: Record<string, unknown>) {
  return (
    resolveNormalizedEmailKey(data.granteeEmailKey) ||
    resolveNormalizedEmailKey(data.granteeEmail) ||
    resolveNormalizedEmailKey(id)
  );
}

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
}

function ownerDoc(uid: string) {
  return doc(db, 'owners', uid);
}

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

function usernameDoc(slotlymeId: string) {
  return doc(db, 'usernames', slotlymeId);
}

function calendarDoc(calendarId: string) {
  return doc(db, 'calendars', calendarId);
}

function publicCalendarSlugDoc(slug: string) {
  return doc(db, 'publicCalendarSlugs', slug);
}

function calendarAccessCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'access');
}

function calendarRequestsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'requests');
}

function calendarSlotsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'slots');
}

function calendarSlotDoc(calendarId: string, slotId: string) {
  return doc(db, 'calendars', calendarId, 'slots', slotId);
}

function slotEventsCollection(calendarId: string, slotId: string) {
  return collection(db, 'calendars', calendarId, 'slots', slotId, 'events');
}

function calendarAppointmentsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'appointments');
}

function calendarNotificationsCollection(calendarId: string) {
  return collection(db, 'calendars', calendarId, 'notifications');
}

function ownerDevicesCollection(ownerUid: string) {
  return collection(db, 'owners', ownerUid, 'devices');
}

function ownerConnectedCalendarPreferencesCollection(ownerUid: string) {
  return collection(db, 'owners', ownerUid, 'connectedCalendarPreferences');
}

function ownerConnectedCalendarPreferenceDoc(ownerUid: string, calendarId: string) {
  return doc(db, 'owners', ownerUid, 'connectedCalendarPreferences', calendarId);
}

const ownerSetupInFlight = new Map<string, Promise<{ calendarId: string }>>();

function mapOwnerProfile(id: string, data: Record<string, unknown>): OwnerProfile {
  return {
    uid: String(data.uid ?? id),
    email: String(data.email ?? ''),
    emailKey: String(data.emailKey ?? ''),
    calendarId: String(data.calendarId ?? id),
    slotlymeId:
      typeof data.slotlymeId === 'string' && data.slotlymeId.trim().length
        ? data.slotlymeId.trim()
        : null,
    subscriptionTier: data.subscriptionTier === 'pro' ? 'pro' : 'free',
    primaryIdentityType: 'email',
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

function mapCalendar(id: string, data: Record<string, unknown>): CalendarRecord {
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    ownerEmail: String(data.ownerEmail ?? ''),
    ownerEmailKey: String(data.ownerEmailKey ?? ''),
    visibility: data.visibility === 'public' ? 'public' : 'restricted',
    publicSlug:
      typeof data.publicSlug === 'string' && data.publicSlug.trim().length
        ? data.publicSlug.trim()
        : null,
    description:
      typeof data.description === 'string' && data.description.trim().length
        ? data.description.trim()
        : null,
    notifyOnNewSlotsAvailable: Boolean(data.notifyOnNewSlotsAvailable),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

const reservedPublicSlugs = new Set([
  'login',
  'register',
  'agb',
  'datenschutz',
  'settings',
  'public-calendar',
  'my-calendar',
  'request-calendar-access',
  'forgot-password',
  'shared-calendar',
  'slots',
  'modal',
  'api',
  'admin',
]);

function normalizeSlotlymeUserId(slotlymeId: string) {
  return slotlymeId.trim().toLowerCase();
}

function validateSlotlymeUserId(slotlymeId: string) {
  const normalizedSlotlymeId = normalizeSlotlymeUserId(slotlymeId);

  if (!normalizedSlotlymeId) {
    return '';
  }

  if (normalizedSlotlymeId.length < 3 || normalizedSlotlymeId.length > 30) {
    throw new Error('Die Slotlyme ID muss zwischen 3 und 30 Zeichen lang sein.');
  }

  if (!/^[a-z0-9-]+$/.test(normalizedSlotlymeId)) {
    throw new Error(
      'Die Slotlyme ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'
    );
  }

  return normalizedSlotlymeId;
}

function normalizePublicSlug(slug: string) {
  return slug.trim();
}

function validatePublicSlug(slug: string) {
  const normalizedSlug = normalizePublicSlug(slug);

  if (!normalizedSlug) {
    return '';
  }

  if (normalizedSlug.length < 3 || normalizedSlug.length > 30) {
    throw new Error('Der Slug muss zwischen 3 und 30 Zeichen lang sein.');
  }

  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
    throw new Error(
      'Die Kalender-ID darf nur Kleinbuchstaben (a-z), Zahlen (0-9) und Bindestriche enthalten.'
    );
  }

  if (reservedPublicSlugs.has(normalizedSlug)) {
    throw new Error('Dieser Slug ist reserviert und kann nicht verwendet werden.');
  }

  return normalizedSlug;
}

export function validateCalendarPublicSlugInput(slug: string) {
  return validatePublicSlug(slug);
}

export function validateSlotlymeUserIdInput(slotlymeId: string) {
  return validateSlotlymeUserId(slotlymeId);
}

export async function isSlotlymeUserIdAvailable(
  slotlymeId: string,
  currentUid?: string | null
) {
  const normalizedSlotlymeId = validateSlotlymeUserId(slotlymeId);

  if (!normalizedSlotlymeId) {
    return false;
  }

  const usernameSnapshot = await getDoc(usernameDoc(normalizedSlotlymeId));

  if (!usernameSnapshot.exists()) {
    return true;
  }

  const claimedUid =
    typeof usernameSnapshot.data().uid === 'string' ? usernameSnapshot.data().uid : null;

  return claimedUid === currentUid;
}

function mapAccess(id: string, data: Record<string, unknown>): CalendarAccessRecord {
  const granteeEmail =
    typeof data.granteeEmail === 'string' && data.granteeEmail.trim()
      ? data.granteeEmail.trim()
      : typeof data.granteeEmailKey === 'string'
        ? data.granteeEmailKey.trim()
        : id;

  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    ownerId: String(data.ownerId ?? ''),
    granteeEmail,
    granteeEmailKey: resolveAccessEmailKey(id, data),
    phoneNumber:
      typeof data.phoneNumber === 'string' && data.phoneNumber.trim()
        ? data.phoneNumber.trim()
        : null,
    displayName:
      typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName.trim()
        : null,
    status: data.status === 'revoked' ? 'revoked' : 'approved',
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

function mapAccessRequest(
  id: string,
  data: Record<string, unknown>
): CalendarAccessRequestRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    calendarSlug: typeof data.calendarSlug === 'string' ? data.calendarSlug : null,
    requesterUserId: typeof data.requesterUserId === 'string' ? data.requesterUserId : null,
    requesterEmail: String(data.requesterEmail ?? ''),
    requesterEmailKey: String(data.requesterEmailKey ?? ''),
    status:
      data.status === 'approved'
        ? 'approved'
        : data.status === 'rejected'
          ? 'rejected'
          : data.status === 'cancelled'
            ? 'cancelled'
          : 'pending',
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

function mapAppointment(id: string, data: Record<string, unknown>): AppointmentRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    slotId: typeof data.slotId === 'string' ? data.slotId : null,
    ownerId: String(data.ownerId ?? ''),
    bookedByUserId:
      typeof data.bookedByUserId === 'string'
        ? data.bookedByUserId
        : typeof data.createdByUserId === 'string'
          ? data.createdByUserId
          : null,
    participantName: typeof data.participantName === 'string' ? data.participantName : null,
    participantPhone: typeof data.participantPhone === 'string' ? data.participantPhone : null,
    bookedByEmail: String(data.bookedByEmail ?? data.participantEmail ?? ''),
    bookedByEmailKey: String(data.bookedByEmailKey ?? data.participantEmailKey ?? ''),
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
    cancelledByUserId:
      typeof data.cancelledByUserId === 'string' ? data.cancelledByUserId : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    cancelledAt: asDate(data.cancelledAt),
  };
}

function mapSlot(id: string, data: Record<string, unknown>): CalendarSlotRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    ownerId: String(data.ownerId ?? ''),
    startsAt: asDate(data.startsAt),
    endsAt: asDate(data.endsAt),
    status:
      data.status === 'booked'
        ? 'booked'
        : data.status === 'inactive' || data.status === 'hold' || data.status === 'cancelled'
          ? 'inactive'
          : 'available',
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

function mapSlotEvent(id: string, data: Record<string, unknown>): CalendarSlotEventRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    slotId: String(data.slotId ?? ''),
    type:
      data.type === 'edited' ||
      data.type === 'booked' ||
      data.type === 'assigned_by_owner' ||
      data.type === 'set_inactive' ||
      data.type === 'held_by_owner' ||
      data.type === 'cancelled_by_owner' ||
      data.type === 'reactivated' ||
      data.type === 'released' ||
      data.type === 'updated'
        ? data.type === 'held_by_owner'
          ? 'set_inactive'
          : data.type === 'released'
            ? 'reactivated'
            : data.type === 'updated'
              ? 'edited'
              : data.type
        : 'created',
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : null,
    actorRole:
      data.actorRole === 'contact' || data.actorRole === 'system' ? data.actorRole : 'owner',
    targetEmail: typeof data.targetEmail === 'string' ? data.targetEmail : null,
    statusAfter:
      data.statusAfter === 'booked' ||
      data.statusAfter === 'inactive' ||
      data.statusAfter === 'hold' ||
      data.statusAfter === 'cancelled'
        ? data.statusAfter
            === 'hold' || data.statusAfter === 'cancelled'
          ? 'inactive'
          : data.statusAfter
        : data.statusAfter === 'available'
          ? 'available'
          : null,
    note: typeof data.note === 'string' ? data.note : null,
    createdAt: asDate(data.createdAt),
  };
}

function mapNotification(id: string, data: Record<string, unknown>): NotificationRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
    slotId: typeof data.slotId === 'string' ? data.slotId : null,
    recipientEmail: String(data.recipientEmail ?? ''),
    recipientEmailKey: String(data.recipientEmailKey ?? ''),
    channel:
      data.channel === 'email' || data.channel === 'push' ? data.channel : 'in_app',
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
      data.status === 'sent' ||
      data.status === 'failed' ||
      data.status === 'read' ||
      data.status === 'processing'
        ? data.status
        : 'pending',
    deliveryError: typeof data.deliveryError === 'string' ? data.deliveryError : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    readAt: asDate(data.readAt),
  };
}

function buildNotificationContent(params: {
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
      return {
        title: 'Slot erhalten',
        body: `Slotzeit am ${dateTimeLabel} erhalten`,
      };
    case 'slot_cancelled':
      return {
        title: 'Slot storniert',
        body: `Slot storniert bei ${ownerLabel}`,
      };
    case 'new_slots_available':
      return {
        title: 'Neue freie Slots',
        body: `Neue freie Slots bei ${ownerLabel}`,
      };
    case 'appointment_assigned':
      return {
        title: 'Termin erhalten',
        body: `Slotzeit am ${dateTimeLabel} erhalten`,
      };
    case 'appointment_cancelled':
      return {
        title: 'Termin storniert',
        body: `Slot storniert bei ${ownerLabel}`,
      };
    case 'booking_confirmation':
      return {
        title: 'Buchung bestätigt',
        body: `Deine Buchung am ${dateTimeLabel} wurde gespeichert`,
      };
    case 'account_creation_invite':
      return {
        title: 'Konto vorbereiten',
      body: `Bestätige deine E-Mail für ein späteres Konto bei ${ownerLabel}`,
      };
    default:
      return {
        title: 'Neue Buchung',
        body: `${ownerLabel} hat eine neue Buchung erhalten`,
      };
  }
}

export async function ensureOwnerAccountSetup(params: {
  uid: string;
  email: string;
  slotlymeId?: string | null;
}) {
  const trimmedEmail = params.email.trim();

  if (!trimmedEmail) {
    throw new Error('Für die Einrichtung des Kalenders ist eine E-Mail-Adresse erforderlich.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const normalizedSlotlymeId = params.slotlymeId
    ? validateSlotlymeUserId(params.slotlymeId)
    : '';
  const calendarId = params.uid;
  const ownerRef = ownerDoc(params.uid);
  const userRef = userDoc(params.uid);
  const ownCalendarRef = calendarDoc(calendarId);
  const setupKey = `${params.uid}:${emailKey}:${normalizedSlotlymeId}`;
  const existingSetupPromise = ownerSetupInFlight.get(setupKey);

  if (existingSetupPromise) {
    return existingSetupPromise;
  }

  const setupPromise = (async () => {
    await runTransaction(db, async (transaction) => {
      const ownerSnapshot = await transaction.get(ownerRef);
      const userSnapshot = await transaction.get(userRef);
      const calendarSnapshot = await transaction.get(ownCalendarRef);

      if (normalizedSlotlymeId) {
        const usernameRef = usernameDoc(normalizedSlotlymeId);
        const usernameSnapshot = await transaction.get(usernameRef);
        const claimedUid =
          usernameSnapshot.exists() && typeof usernameSnapshot.data().uid === 'string'
            ? usernameSnapshot.data().uid
            : null;

        if (claimedUid && claimedUid !== params.uid) {
          throw new Error('Diese Slotlyme ID ist bereits vergeben.');
        }

        transaction.set(
          usernameRef,
          {
            uid: params.uid,
            email: trimmedEmail,
            ...(usernameSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      transaction.set(
        ownerRef,
        {
          uid: params.uid,
          email: trimmedEmail,
          emailKey,
          calendarId,
          subscriptionTier:
            ownerSnapshot.exists() && ownerSnapshot.data().subscriptionTier === 'pro'
              ? 'pro'
              : 'free',
          primaryIdentityType: 'email',
          ...(normalizedSlotlymeId ? { slotlymeId: normalizedSlotlymeId } : {}),
          ...(ownerSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        userRef,
        {
          uid: params.uid,
          email: trimmedEmail,
          emailKey,
          subscriptionTier:
            userSnapshot.exists() && userSnapshot.data().subscriptionTier === 'pro'
              ? 'pro'
              : 'free',
          ...(normalizedSlotlymeId ? { slotlymeId: normalizedSlotlymeId } : {}),
          ...(userSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        ownCalendarRef,
        {
          ownerId: params.uid,
          ownerEmail: trimmedEmail,
          ownerEmailKey: emailKey,
          ...(calendarSnapshot.exists()
            ? {}
            : {
                visibility: 'restricted',
                notifyOnNewSlotsAvailable: false,
                createdAt: serverTimestamp(),
              }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    return { calendarId };
  })();

  ownerSetupInFlight.set(setupKey, setupPromise);

  try {
    return await setupPromise;
  } finally {
    ownerSetupInFlight.delete(setupKey);
  }
}

export async function getOwnerProfile(uid: string) {
  const snapshot = await getDoc(ownerDoc(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return mapOwnerProfile(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function getOwnerCalendar(calendarId: string) {
  const snapshot = await getDoc(calendarDoc(calendarId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function getPublicCalendarIdBySlug(slug: string) {
  const normalizedSlug = validatePublicSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const slugSnapshot = await getDoc(publicCalendarSlugDoc(normalizedSlug));

  if (!slugSnapshot.exists()) {
    return null;
  }

  const calendarId =
    typeof slugSnapshot.data().calendarId === 'string' ? slugSnapshot.data().calendarId : null;

  if (!calendarId) {
    return null;
  }

  const calendarSnapshot = await getDoc(calendarDoc(calendarId));

  if (!calendarSnapshot.exists()) {
    return null;
  }

  const calendar = mapCalendar(
    calendarSnapshot.id,
    calendarSnapshot.data() as Record<string, unknown>
  );

  if (calendar.visibility !== 'public' || calendar.publicSlug !== normalizedSlug) {
    return null;
  }

  return calendar.id;
}

export async function isCalendarPublicSlugAvailable(
  slug: string,
  currentCalendarId?: string | null
) {
  const normalizedSlug = validatePublicSlug(slug);

  if (!normalizedSlug) {
    return false;
  }

  const slugSnapshot = await getDoc(publicCalendarSlugDoc(normalizedSlug));

  if (!slugSnapshot.exists()) {
    return true;
  }

  const claimedCalendarId =
    typeof slugSnapshot.data().calendarId === 'string' ? slugSnapshot.data().calendarId : null;

  return claimedCalendarId === currentCalendarId;
}

async function getCalendarBySlug(slug: string) {
  const normalizedSlug = validatePublicSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const slugSnapshot = await getDoc(publicCalendarSlugDoc(normalizedSlug));

  if (!slugSnapshot.exists()) {
    return null;
  }

  const calendarId =
    typeof slugSnapshot.data().calendarId === 'string' ? slugSnapshot.data().calendarId : null;

  if (!calendarId) {
    return null;
  }

  const calendarSnapshot = await getDoc(calendarDoc(calendarId));

  if (!calendarSnapshot.exists()) {
    return null;
  }

  const calendar = mapCalendar(
    calendarSnapshot.id,
    calendarSnapshot.data() as Record<string, unknown>
  );

  if (calendar.publicSlug !== normalizedSlug) {
    return null;
  }

  return calendar;
}

async function findCalendarAccessRequestByRequester(params: {
  calendarId: string;
  requesterUserId?: string | null;
  requesterEmail?: string | null;
}) {
  if (params.requesterUserId) {
    const userQuery = query(
      calendarRequestsCollection(params.calendarId),
      where('requesterUserId', '==', params.requesterUserId),
      limit(1)
    );
    const userSnapshots = await getDocs(userQuery);

    if (userSnapshots.docs.length) {
      return userSnapshots.docs[0];
    }
  }

  const trimmedRequesterEmail = params.requesterEmail?.trim() ?? '';

  if (!trimmedRequesterEmail) {
    return null;
  }

  const emailKey = normalizeEmail(trimmedRequesterEmail);
  const emailQuery = query(
    calendarRequestsCollection(params.calendarId),
    where('requesterEmailKey', '==', emailKey),
    limit(1)
  );
  const emailSnapshots = await getDocs(emailQuery);

  if (emailSnapshots.docs.length) {
    return emailSnapshots.docs[0];
  }

  return null;
}

export function subscribeToOwnerCalendar(
  ownerId: string,
  onData: (calendar: CalendarRecord | null) => void,
  onError: (error: Error) => void
) {
  return subscribeToCalendar(ownerId, onData, onError);
}

export function subscribeToCalendar(
  calendarId: string,
  onData: (calendar: CalendarRecord | null) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    calendarDoc(calendarId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>));
    },
    onError
  );
}

async function listApprovedCalendarAccess(email: string) {
  const normalizedEmailKey = normalizeEmail(email);
  const accessQuery = query(
    collectionGroup(db, 'access'),
    where('granteeEmailKey', '==', normalizedEmailKey),
    where('status', '==', 'approved')
  );
  const directSnapshots = await getDocs(accessQuery);

  if (directSnapshots.docs.length) {
    return directSnapshots.docs.map((snapshot) =>
      mapAccess(snapshot.id, snapshot.data() as Record<string, unknown>)
    );
  }

  // Defensive fallback for older/inconsistent access docs where only the display email
  // or document id carries the grantee information with differing casing.
  const fallbackQuery = query(
    collectionGroup(db, 'access'),
    where('status', '==', 'approved')
  );
  const fallbackSnapshots = await getDocs(fallbackQuery);
  const matchingRecords = fallbackSnapshots.docs
    .map((snapshot) => mapAccess(snapshot.id, snapshot.data() as Record<string, unknown>))
    .filter((record) => {
      const normalizedCandidates = new Set([
        record.granteeEmailKey,
        resolveNormalizedEmailKey(record.granteeEmail),
        resolveNormalizedEmailKey(record.id),
      ]);

      return normalizedCandidates.has(normalizedEmailKey);
    });

  return Array.from(
    new Map(
      matchingRecords.map((record) => [`${record.calendarId}:${record.granteeEmailKey}`, record])
    ).values()
  );
}
async function getJoinedCalendars(email: string) {
  const accessRecords = await listApprovedCalendarAccess(email);

  const uniqueCalendarIds = Array.from(
    new Set(accessRecords.map((record) => record.calendarId).filter(Boolean))
  );

  const calendarSnapshots = await Promise.all(
    uniqueCalendarIds.map(async (calendarId) => {
      try {
        const snapshot = await getDoc(calendarDoc(calendarId));
        const mappedCalendar = snapshot.exists()
          ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>)
          : null;

        return mappedCalendar;
      } catch (error) {
        throw error;
      }
    })
  );

  const joinedCalendars = calendarSnapshots.filter(
    (calendar): calendar is CalendarRecord => calendar !== null
  );

  return {
    joinedCalendars,
  };
}

export async function listJoinedCalendars(email: string) {
  const result = await getJoinedCalendars(email);
  return result.joinedCalendars;
}

export function subscribeToJoinedCalendars(
  email: string,
  onData: (calendars: CalendarRecord[]) => void,
  onError: (error: Error) => void
) {
  const accessQuery = query(
    collectionGroup(db, 'access'),
    where('granteeEmailKey', '==', normalizeEmail(email)),
    where('status', '==', 'approved')
  );

  return onSnapshot(
    accessQuery,
    (snapshot) => {
      void (async () => {
        try {
          const accessRecords = snapshot.docs.map((documentSnapshot) =>
            mapAccess(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
          );
          const uniqueCalendarIds = Array.from(
            new Set(accessRecords.map((record) => record.calendarId).filter(Boolean))
          );

          const calendarSnapshots = await Promise.all(
            uniqueCalendarIds.map(async (calendarId) => {
              const calendarSnapshot = await getDoc(calendarDoc(calendarId));

              if (!calendarSnapshot.exists()) {
                return null;
              }

              return mapCalendar(
                calendarSnapshot.id,
                calendarSnapshot.data() as Record<string, unknown>
              );
            })
          );

          onData(calendarSnapshots.filter((calendar): calendar is CalendarRecord => calendar !== null));
        } catch (nextError) {
          onError(
            nextError instanceof Error
              ? nextError
              : new Error('Verbundene Kalender konnten nicht geladen werden.')
          );
        }
      })();
    },
    onError
  );
}

export function subscribeToConnectedCalendarFavorites(
  ownerUid: string,
  onData: (favoriteCalendarIds: string[]) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    ownerConnectedCalendarPreferencesCollection(ownerUid),
    (snapshot) => {
      onData(
        snapshot.docs
          .filter((documentSnapshot) => documentSnapshot.data().isFavorite === true)
          .map((documentSnapshot) => documentSnapshot.id)
      );
    },
    onError
  );
}

export async function setConnectedCalendarFavorite(params: {
  ownerUid: string;
  calendarId: string;
  isFavorite: boolean;
}) {
  const preferenceRef = ownerConnectedCalendarPreferenceDoc(params.ownerUid, params.calendarId);

  if (!params.isFavorite) {
    await deleteDoc(preferenceRef);
    return;
  }

  const preferenceSnapshots = await getDocs(ownerConnectedCalendarPreferencesCollection(params.ownerUid));
  const favoriteIds = new Set(
    preferenceSnapshots.docs
      .filter((documentSnapshot) => documentSnapshot.data().isFavorite === true)
      .map((documentSnapshot) => documentSnapshot.id)
  );

  if (!favoriteIds.has(params.calendarId) && favoriteIds.size >= 5) {
    throw new Error('Maximal 5 Favoriten');
  }

  await setDoc(
    preferenceRef,
    {
      ownerUid: params.ownerUid,
      calendarId: params.calendarId,
      isFavorite: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeConnectedCalendar(params: {
  ownerUid: string;
  calendarId: string;
  granteeEmail: string;
}) {
  await removeCalendarAccess({
    calendarId: params.calendarId,
    granteeEmail: params.granteeEmail,
  });

  await deleteDoc(ownerConnectedCalendarPreferenceDoc(params.ownerUid, params.calendarId));
}

export async function listUpcomingAppointmentsForParticipant(email: string) {
  const appointmentsQuery = query(
    collectionGroup(db, 'appointments'),
    where('participantEmailKey', '==', normalizeEmail(email)),
    where('status', '==', 'booked'),
    orderBy('startsAt', 'asc'),
    limit(3)
  );
  const snapshots = await getDocs(appointmentsQuery);

  return snapshots.docs.map((snapshot) =>
    mapAppointment(snapshot.id, snapshot.data() as Record<string, unknown>)
  );
}

export async function listRecentNotificationsForRecipient(email: string) {
  const notificationsQuery = query(
    collectionGroup(db, 'notifications'),
    where('recipientEmailKey', '==', normalizeEmail(email)),
    orderBy('createdAt', 'desc'),
    limit(3)
  );
  const snapshots = await getDocs(notificationsQuery);

  return snapshots.docs.map((snapshot) =>
    mapNotification(snapshot.id, snapshot.data() as Record<string, unknown>)
  );
}

export async function getDashboardData(params: { uid: string; email: string }) {
  await ensureOwnerAccountSetup(params);

  try {
    const joinedCalendarResult = await getJoinedCalendars(params.email);

    const [ownerProfile, ownerCalendar] = await Promise.all([
      getOwnerProfile(params.uid),
      getOwnerCalendar(params.uid),
    ]);

    return {
      ownerProfile,
      ownerCalendar,
      joinedCalendars: joinedCalendarResult.joinedCalendars,
      upcomingAppointments: [],
      recentNotifications: [],
    } satisfies DashboardData;
  } catch (error) {
    throw new Error(getDashboardLoadErrorMessage(error));
  }
}

export async function upsertCalendarAccess(params: {
  calendarId: string;
  ownerId: string;
  granteeEmail: string;
  phoneNumber?: string | null;
  displayName?: string | null;
  status?: CalendarAccessRecord['status'];
}) {
  const trimmedEmail = params.granteeEmail.trim();

  if (!trimmedEmail) {
    throw new Error('Bitte gib eine E-Mail-Adresse ein.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const phoneNumber = validateOptionalPhoneNumber(params.phoneNumber);
  const displayName =
    typeof params.displayName === 'string' && params.displayName.trim()
      ? params.displayName.trim()
      : null;
  const accessRef = doc(calendarAccessCollection(params.calendarId), emailKey);

  await setDoc(
    accessRef,
    {
      calendarId: params.calendarId,
      ownerId: params.ownerId,
      granteeEmail: trimmedEmail,
      granteeEmailKey: emailKey,
      phoneNumber,
      displayName,
      status: params.status ?? 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeCalendarAccess(params: {
  calendarId: string;
  granteeEmail: string;
}) {
  const trimmedEmail = params.granteeEmail.trim();

  if (!trimmedEmail) {
    throw new Error('Bitte gib eine E-Mail-Adresse ein.');
  }

  const accessRef = doc(
    calendarAccessCollection(params.calendarId),
    normalizeEmail(trimmedEmail)
  );

  await deleteDoc(accessRef);
}

export async function upsertCalendarAccessRequest(params: {
  calendarId: string;
  calendarSlug?: string | null;
  requestId?: string | null;
  requesterUserId?: string | null;
  requesterEmail: string;
  status?: CalendarAccessRequestRecord['status'];
}) {
  const trimmedEmail = params.requesterEmail.trim();

  if (!trimmedEmail) {
    throw new Error('Bitte gib eine E-Mail-Adresse an.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const requestRef = doc(
    calendarRequestsCollection(params.calendarId),
    params.requestId ?? params.requesterUserId ?? emailKey
  );

  await setDoc(
    requestRef,
    {
      calendarId: params.calendarId,
      calendarSlug: params.calendarSlug ?? null,
      requesterUserId: params.requesterUserId ?? null,
      requesterEmail: trimmedEmail,
      requesterEmailKey: emailKey,
      status: params.status ?? 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToCalendarAccessList(
  calendarId: string,
  onData: (records: CalendarAccessRecord[]) => void,
  onError: (error: Error) => void
) {
  const accessQuery = query(calendarAccessCollection(calendarId), orderBy('granteeEmailKey', 'asc'));

  return onSnapshot(
    accessQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((documentSnapshot) =>
          mapAccess(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
      );
    },
    onError
  );
}

export function subscribeToCalendarAccessRequests(
  calendarId: string,
  onData: (records: CalendarAccessRequestRecord[]) => void,
  onError: (error: Error) => void
) {
  const requestsQuery = query(calendarRequestsCollection(calendarId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((documentSnapshot) =>
          mapAccessRequest(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
      );
    },
    onError
  );
}

export function subscribeToPendingCalendarAccessRequestsByRequester(
  requesterUserId: string,
  onData: (records: CalendarAccessRequestRecord[]) => void,
  onError: (error: Error) => void
) {
  const requestsQuery = query(
    collectionGroup(db, 'requests'),
    where('requesterUserId', '==', requesterUserId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const nextRecords = snapshot.docs
        .map((documentSnapshot) =>
          mapAccessRequest(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
        .filter((record) => record.status === 'pending')
        .sort((left, right) => {
          const leftTime = left.createdAt?.getTime() ?? 0;
          const rightTime = right.createdAt?.getTime() ?? 0;
          return rightTime - leftTime;
        });

      onData(nextRecords);
    },
    onError
  );
}

export async function requestCalendarAccessBySlug(params: {
  slug: string;
  requesterUserId: string;
  requesterEmail: string;
}) {
  const trimmedSlug = params.slug.trim();
  const trimmedRequesterEmail = params.requesterEmail.trim();

  if (!trimmedSlug) {
    throw new Error('Ein Kalender-Link oder eine Kalender-ID ist erforderlich.');
  }

  if (!trimmedRequesterEmail) {
    throw new Error('Eine eigene E-Mail ist erforderlich.');
  }

  const requesterEmailKey = normalizeEmail(trimmedRequesterEmail);

  const calendar = await getCalendarBySlug(trimmedSlug);
  if (calendar?.ownerId === params.requesterUserId) {
    throw new Error('Dies ist dein eigener Kalender');
  }
  if (calendar?.ownerId === params.requesterUserId) {
    throw new Error('Für den eigenen Kalender musst du keine Anfrage stellen.');
  }

  if (!calendar) {
    throw new Error('Zu diesem Kalender-Link wurde kein Kalender gefunden.');
  }

  const existingAccessSnapshot = await getDoc(
    doc(calendarAccessCollection(calendar.id), requesterEmailKey)
  );

  if (
    existingAccessSnapshot.exists() &&
    existingAccessSnapshot.data().status === 'approved'
  ) {
    throw new Error('Bereits freigegeben');
  }

  if (
    existingAccessSnapshot.exists() &&
    existingAccessSnapshot.data().status === 'approved'
  ) {
    throw new Error('Du hast bereits Zugriff auf diesen Kalender.');
  }

  if (calendar.visibility !== 'restricted') {
    throw new Error('Anfragen sind aktuell nur für eingeschränkte Kalender verfügbar.');
  }

  const existingRequestSnapshot = await findCalendarAccessRequestByRequester({
    calendarId: calendar.id,
    requesterUserId: params.requesterUserId,
    requesterEmail: trimmedRequesterEmail,
  });

  const existingRequest = existingRequestSnapshot
    ? mapAccessRequest(
        existingRequestSnapshot.id,
        existingRequestSnapshot.data() as Record<string, unknown>
      )
    : null;

  if (existingRequest?.status === 'pending') {
    throw new Error('Anfrage bereits gestellt');
  }

  await upsertCalendarAccessRequest({
    calendarId: calendar.id,
    calendarSlug: calendar.publicSlug,
    requestId: existingRequestSnapshot?.id ?? params.requesterUserId,
    requesterUserId: params.requesterUserId,
    requesterEmail: trimmedRequesterEmail,
    status: 'pending',
  });

  return calendar;
}

export async function approveCalendarAccessRequest(params: {
  calendarId: string;
  ownerId: string;
  requesterEmail: string;
}) {
  const trimmedRequesterEmail = params.requesterEmail.trim();

  if (!trimmedRequesterEmail) {
    throw new Error('Für die Anfrage ist eine E-Mail-Adresse erforderlich.');
  }

  const requesterEmailKey = normalizeEmail(trimmedRequesterEmail);
  const accessRef = doc(calendarAccessCollection(params.calendarId), requesterEmailKey);
  const requestSnapshot = await findCalendarAccessRequestByRequester({
    calendarId: params.calendarId,
    requesterEmail: trimmedRequesterEmail,
  });

  if (!requestSnapshot) {
    throw new Error('Die ausgewählte Anfrage existiert nicht mehr.');
  }

  await runTransaction(db, async (transaction) => {
    const freshRequestSnapshot = await transaction.get(requestSnapshot.ref);

    if (!freshRequestSnapshot.exists()) {
    throw new Error('Die ausgewählte Anfrage existiert nicht mehr.');
    }

    transaction.set(
      accessRef,
      {
        calendarId: params.calendarId,
        ownerId: params.ownerId,
        granteeEmail: trimmedRequesterEmail,
        granteeEmailKey: requesterEmailKey,
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      requestSnapshot.ref,
      {
        status: 'approved',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function rejectCalendarAccessRequest(params: {
  calendarId: string;
  requesterEmail: string;
}) {
  const trimmedRequesterEmail = params.requesterEmail.trim();

  if (!trimmedRequesterEmail) {
    throw new Error('Für die Anfrage ist eine E-Mail-Adresse erforderlich.');
  }

  const requestSnapshot = await findCalendarAccessRequestByRequester({
    calendarId: params.calendarId,
    requesterEmail: trimmedRequesterEmail,
  });

  if (!requestSnapshot) {
    throw new Error('Die ausgewählte Anfrage existiert nicht mehr.');
  }

  await setDoc(
    requestSnapshot.ref,
    {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function cancelCalendarAccessRequest(params: {
  calendarId: string;
  requesterEmail: string;
}) {
  const trimmedRequesterEmail = params.requesterEmail.trim();

  if (!trimmedRequesterEmail) {
    throw new Error('FÃ¼r die Anfrage ist eine E-Mail-Adresse erforderlich.');
  }

  const requestSnapshot = await findCalendarAccessRequestByRequester({
    calendarId: params.calendarId,
    requesterEmail: trimmedRequesterEmail,
  });

  if (!requestSnapshot) {
    throw new Error('Die ausgewählte Anfrage existiert nicht mehr.');
  }

  await setDoc(
    requestSnapshot.ref,
    {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateCalendarNotificationSettings(params: {
  calendarId: string;
  notifyOnNewSlotsAvailable: boolean;
}) {
  await updateDoc(calendarDoc(params.calendarId), {
    notifyOnNewSlotsAvailable: params.notifyOnNewSlotsAvailable,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCalendarDescription(params: {
  calendarId: string;
  description: string;
}) {
  const trimmedDescription = params.description.trim();

  if (trimmedDescription.length > 120) {
    throw new Error('Die Beschreibung darf maximal 120 Zeichen lang sein.');
  }

  await updateDoc(calendarDoc(params.calendarId), {
    description: trimmedDescription || null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCalendarVisibility(params: {
  calendarId: string;
  ownerId: string;
  visibility: CalendarRecord['visibility'];
  publicSlug: string;
}) {
  const normalizedSlug = validatePublicSlug(params.publicSlug);

  if (params.visibility === 'public' && !normalizedSlug) {
    throw new Error('Bitte hinterlege zuerst einen gültigen öffentlichen Link.');
  }

  await runTransaction(db, async (transaction) => {
    const calendarRef = calendarDoc(params.calendarId);
    const calendarSnapshot = await transaction.get(calendarRef);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der Kalender existiert nicht mehr.');
    }

    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    const currentSlug = calendar.publicSlug ? normalizePublicSlug(calendar.publicSlug) : '';
    const nextSlug = normalizedSlug;
    const shouldKeepSlug = Boolean(nextSlug);

    if (shouldKeepSlug) {
      const nextSlugRef = publicCalendarSlugDoc(nextSlug);
      const nextSlugSnapshot = await transaction.get(nextSlugRef);
      const claimedCalendarId =
        nextSlugSnapshot.exists() && typeof nextSlugSnapshot.data().calendarId === 'string'
          ? nextSlugSnapshot.data().calendarId
          : null;

      if (claimedCalendarId && claimedCalendarId !== params.calendarId) {
        throw new Error('Dieser Slug ist bereits vergeben.');
      }

      transaction.set(
        nextSlugRef,
        {
          calendarId: params.calendarId,
          ownerId: params.ownerId,
          updatedAt: serverTimestamp(),
          ...(nextSlugSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
    }

    if (currentSlug && currentSlug !== nextSlug) {
      transaction.delete(publicCalendarSlugDoc(currentSlug));
    }

    transaction.update(calendarRef, {
      visibility: params.visibility,
      publicSlug: shouldKeepSlug ? nextSlug : null,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function saveCalendarPublicSlug(params: {
  calendarId: string;
  ownerId: string;
  visibility: CalendarRecord['visibility'];
  publicSlug: string;
}) {
  await updateCalendarVisibility(params);
}

async function queueNewSlotsAvailableNotifications(params: {
  calendarId: string;
  ownerEmail: string;
}) {
  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

  if (!calendarSnapshot.exists()) {
    return 0;
  }

  const calendar = mapCalendar(
    calendarSnapshot.id,
    calendarSnapshot.data() as Record<string, unknown>
  );

  if (!calendar.notifyOnNewSlotsAvailable) {
    return 0;
  }

  const accessSnapshots = await getDocs(
    query(calendarAccessCollection(params.calendarId), where('status', '==', 'approved'))
  );
  const today = new Date();
  const dayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
  let createdCount = 0;

  for (const accessSnapshot of accessSnapshots.docs) {
    const access = mapAccess(accessSnapshot.id, accessSnapshot.data() as Record<string, unknown>);
    const dedupeKey = `new_slots_available:${access.granteeEmailKey}:${dayKey}`;
    const notificationRef = doc(calendarNotificationsCollection(params.calendarId), dedupeKey);
    const existingNotification = await getDoc(notificationRef);

    if (existingNotification.exists()) {
      continue;
    }

    const content = buildNotificationContent({
      type: 'new_slots_available',
      ownerEmail: params.ownerEmail,
    });

    await setDoc(notificationRef, {
      calendarId: params.calendarId,
      appointmentId: null,
      slotId: null,
      recipientEmail: access.granteeEmail,
      recipientEmailKey: access.granteeEmailKey,
      channel: 'in_app',
      type: 'new_slots_available',
      title: content.title,
      body: content.body,
      dedupeKey,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    createdCount += 1;
  }

  return createdCount;
}

export async function createCalendarSlot(params: {
  calendarId: string;
  ownerId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  if (params.endsAt <= params.startsAt) {
    throw new Error('Die Endzeit muss nach der Startzeit liegen.');
  }

  const slotRef = doc(calendarSlotsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, slotRef.id));

  await runTransaction(db, async (transaction) => {
    transaction.set(slotRef, {
      calendarId: params.calendarId,
      ownerId: params.ownerId,
      startsAt: Timestamp.fromDate(params.startsAt),
      endsAt: Timestamp.fromDate(params.endsAt),
      status: 'available',
      appointmentId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: slotRef.id,
      type: 'created',
      actorUid: params.ownerId,
      actorRole: 'owner',
      targetEmail: null,
      statusAfter: 'available',
      note: null,
      createdAt: serverTimestamp(),
    });
  });

  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

  if (calendarSnapshot.exists()) {
    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    await queueNewSlotsAvailableNotifications({
      calendarId: params.calendarId,
      ownerEmail: calendar.ownerEmail,
    });
  }

  return slotRef.id;
}

export async function createCalendarSlotWithOptionalAssignment(params: {
  calendarId: string;
  ownerId: string;
  startsAt: Date;
  endsAt: Date;
  assigneeEmail?: string | null;
}) {
  const trimmedAssigneeEmail = params.assigneeEmail?.trim() ?? '';

  if (!trimmedAssigneeEmail) {
    return createCalendarSlot({
      calendarId: params.calendarId,
      ownerId: params.ownerId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
    });
  }

  if (params.endsAt <= params.startsAt) {
    throw new Error('Die Endzeit muss nach der Startzeit liegen.');
  }

  const assigneeEmailKey = normalizeEmail(trimmedAssigneeEmail);
  const accessRef = doc(calendarAccessCollection(params.calendarId), assigneeEmailKey);
  const calendarRef = calendarDoc(params.calendarId);
  const slotRef = doc(calendarSlotsCollection(params.calendarId));
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, slotRef.id));
  const notificationRef = doc(calendarNotificationsCollection(params.calendarId));

  await runTransaction(db, async (transaction) => {
    const [calendarSnapshot, accessSnapshot] = await Promise.all([
      transaction.get(calendarRef),
      transaction.get(accessRef),
    ]);

    if (!calendarSnapshot.exists()) {
    throw new Error('Der Kalender ist nicht mehr verfügbar.');
    }

    if (!accessSnapshot.exists() || accessSnapshot.data().status !== 'approved') {
    throw new Error('Die ausgewählte Person ist aktuell nicht freigegeben.');
    }

    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    const content = buildNotificationContent({
      type: 'slot_assigned',
      ownerEmail: calendar.ownerEmail,
      startsAt: params.startsAt,
    });

    transaction.set(slotRef, {
      calendarId: params.calendarId,
      ownerId: params.ownerId,
      startsAt: Timestamp.fromDate(params.startsAt),
      endsAt: Timestamp.fromDate(params.endsAt),
      status: 'booked',
      appointmentId: appointmentRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: slotRef.id,
      ownerId: params.ownerId,
      bookedByUserId: params.ownerId,
      bookedByEmail: trimmedAssigneeEmail,
      bookedByEmailKey: assigneeEmailKey,
      participantEmail: trimmedAssigneeEmail,
      participantEmailKey: assigneeEmailKey,
      startsAt: Timestamp.fromDate(params.startsAt),
      endsAt: Timestamp.fromDate(params.endsAt),
      source: 'manual',
      status: 'booked',
      createdByUserId: params.ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: slotRef.id,
      type: 'assigned_by_owner',
      actorUid: params.ownerId,
      actorRole: 'owner',
      targetEmail: trimmedAssigneeEmail,
      statusAfter: 'booked',
      note: null,
      createdAt: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: slotRef.id,
      recipientEmail: trimmedAssigneeEmail,
      recipientEmailKey: assigneeEmailKey,
      channel: 'in_app',
      type: 'slot_assigned',
      title: content.title,
      body: content.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });
  });

  return slotRef.id;
}

export async function createCalendarSlotsBatch(params: {
  calendarId: string;
  ownerId: string;
  slots: { startsAt: Date; endsAt: Date }[];
}) {
  if (!params.slots.length) {
    throw new Error('Aus dem gewählten Zeitraum konnten keine gültigen Slots erstellt werden.');
  }

  const batch = writeBatch(db);

  for (const slotWindow of params.slots) {
    if (slotWindow.endsAt <= slotWindow.startsAt) {
    throw new Error('Die Endzeit muss nach der Startzeit liegen.');
    }

    const slotRef = doc(calendarSlotsCollection(params.calendarId));
    const eventRef = doc(slotEventsCollection(params.calendarId, slotRef.id));

    batch.set(slotRef, {
      calendarId: params.calendarId,
      ownerId: params.ownerId,
      startsAt: Timestamp.fromDate(slotWindow.startsAt),
      endsAt: Timestamp.fromDate(slotWindow.endsAt),
      status: 'available',
      appointmentId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(eventRef, {
      calendarId: params.calendarId,
      slotId: slotRef.id,
      type: 'created',
      actorUid: params.ownerId,
      actorRole: 'owner',
      targetEmail: null,
      statusAfter: 'available',
      note: null,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();

  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

  if (calendarSnapshot.exists()) {
    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    await queueNewSlotsAvailableNotifications({
      calendarId: params.calendarId,
      ownerEmail: calendar.ownerEmail,
    });
  }

  return params.slots.length;
}

export function subscribeToOwnerSlots(
  calendarId: string,
  onData: (slots: CalendarSlotRecord[]) => void,
  onError: (error: Error) => void
) {
  const slotsQuery = query(calendarSlotsCollection(calendarId), orderBy('startsAt', 'asc'));

  return onSnapshot(
    slotsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((documentSnapshot) =>
          mapSlot(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
      );
    },
    onError
  );
}

export function subscribeToOwnerSlotsInRange(
  calendarId: string,
  rangeStart: Date,
  rangeEnd: Date,
  onData: (slots: CalendarSlotRecord[]) => void,
  onError: (error: Error) => void
) {
  const slotsQuery = query(
    calendarSlotsCollection(calendarId),
    where('startsAt', '<', Timestamp.fromDate(rangeEnd)),
    where('endsAt', '>', Timestamp.fromDate(rangeStart)),
    orderBy('startsAt', 'asc'),
    orderBy('endsAt', 'asc')
  );

  return onSnapshot(
    slotsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((documentSnapshot) =>
          mapSlot(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
      );
    },
    onError
  );
}

export async function setCalendarSlotInactive(params: {
  calendarId: string;
  slotId: string;
  actorUid?: string;
}) {
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));

  return runTransaction<
    'inactive' | 'already_inactive'
  >(db, async (transaction) => {
    const snapshot = await transaction.get(slotRef);

    if (!snapshot.exists()) {
    throw new Error('Der ausgewählte Slot existiert nicht mehr.');
    }

    const slot = mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
    throw new Error('Gebuchte Slots können nicht entfernt werden.');
    }

    if (slot.status === 'inactive') {
      return 'already_inactive';
    }

    transaction.update(slotRef, {
      status: 'inactive',
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: 'set_inactive',
      actorUid: params.actorUid ?? null,
      actorRole: 'owner',
      targetEmail: null,
      statusAfter: 'inactive',
      note: null,
      createdAt: serverTimestamp(),
    });

    return 'inactive';
  });
}

export async function cancelCalendarSlot(params: {
  calendarId: string;
  slotId: string;
  actorUid?: string;
}) {
  return setCalendarSlotInactive(params);
}

export async function updateCalendarSlotAvailability(params: {
  calendarId: string;
  slotId: string;
  actorUid?: string;
  nextStatus: 'available' | 'inactive';
}) {
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));

  return runTransaction<'updated' | 'already_set'>(db, async (transaction) => {
    const snapshot = await transaction.get(slotRef);

    if (!snapshot.exists()) {
      throw new Error('Der ausgewählte Slot existiert nicht mehr.');
    }

    const slot = mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
      throw new Error('Gebuchte Slots können nicht umgestellt werden.');
    }

    if (slot.status === params.nextStatus) {
      return 'already_set';
    }

    transaction.update(slotRef, {
      status: params.nextStatus,
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: params.nextStatus === 'inactive' ? 'set_inactive' : 'reactivated',
      actorUid: params.actorUid ?? null,
      actorRole: 'owner',
      targetEmail: null,
      statusAfter: params.nextStatus,
      note: null,
      createdAt: serverTimestamp(),
    });

    return 'updated';
  });
}

export async function updateCalendarSlotTimes(params: {
  calendarId: string;
  slotId: string;
  actorUid?: string;
  startsAt: Date;
  endsAt: Date;
}) {
  if (params.endsAt <= params.startsAt) {
    throw new Error('Die Endzeit muss nach der Startzeit liegen.');
  }

  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));
  const existingSlotsSnapshot = await getDocs(
    query(calendarSlotsCollection(params.calendarId), orderBy('startsAt', 'asc'))
  );

  return runTransaction<'updated' | 'unchanged'>(db, async (transaction) => {
    const slotSnapshot = await transaction.get(slotRef);

    if (!slotSnapshot.exists()) {
      throw new Error('Der ausgewählte Slot existiert nicht mehr.');
    }

    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
      throw new Error('Gebuchte Slots können zeitlich nicht bearbeitet werden.');
    }

    const overlappingSlots = findOverlappingSlots(
      existingSlotsSnapshot.docs.map((documentSnapshot) =>
        mapSlot(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
      ),
      [{ startsAt: params.startsAt, endsAt: params.endsAt }],
      { excludeSlotIds: [params.slotId] }
    );

    if (overlappingSlots.length) {
      throw new Error('Dieser Slot überschneidet sich mit einem bestehenden Slot.');
    }

    const hasChanged =
      !slot.startsAt ||
      !slot.endsAt ||
      slot.startsAt.getTime() !== params.startsAt.getTime() ||
      slot.endsAt.getTime() !== params.endsAt.getTime();

    if (!hasChanged) {
      return 'unchanged';
    }

    transaction.update(slotRef, {
      startsAt: Timestamp.fromDate(params.startsAt),
      endsAt: Timestamp.fromDate(params.endsAt),
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: 'edited',
      actorUid: params.actorUid ?? null,
      actorRole: 'owner',
      targetEmail: null,
      statusAfter: slot.status,
      note: null,
      createdAt: serverTimestamp(),
    });

    return 'updated';
  });
}

export async function assignCalendarSlotByOwner(params: {
  calendarId: string;
  slotId: string;
  ownerId: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string | null;
}) {
  const trimmedName = params.participantName.trim();
  const trimmedEmail = params.participantEmail.trim();
  const normalizedPhoneNumber = validateOptionalPhoneNumber(params.participantPhone);

  if (!trimmedName) {
    throw new Error('Bitte gib einen Namen ein.');
  }

  if (!trimmedEmail) {
    throw new Error('Bitte gib eine E-Mail-Adresse ein.');
  }

  const participantEmailKey = normalizeEmail(trimmedEmail);
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const calendarRef = calendarDoc(params.calendarId);
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));
  const inAppNotificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const emailNotificationRef = doc(calendarNotificationsCollection(params.calendarId));

  return runTransaction(db, async (transaction) => {
    const [calendarSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(calendarRef),
      transaction.get(slotRef),
    ]);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der Kalender ist nicht mehr verfügbar.');
    }

    if (!slotSnapshot.exists()) {
      throw new Error('Der ausgewählte Slot existiert nicht mehr.');
    }

    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (!slot.startsAt || !slot.endsAt) {
      throw new Error('Für diesen Slot fehlen gültige Zeitangaben.');
    }

    if (slot.status !== 'available' || slot.appointmentId) {
      throw new Error('Dieser Slot ist nicht mehr verfügbar.');
    }

    const content = buildNotificationContent({
      type: 'slot_assigned',
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
    });

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      ownerId: params.ownerId,
      bookedByUserId: null,
      participantName: trimmedName,
      participantPhone: normalizedPhoneNumber,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey: participantEmailKey,
      participantEmail: trimmedEmail,
      participantEmailKey: participantEmailKey,
      guestBooking: true,
      accountCreationRequested: false,
      startsAt: Timestamp.fromDate(slot.startsAt),
      endsAt: Timestamp.fromDate(slot.endsAt),
      source: 'manual',
      status: 'booked',
      createdByUserId: params.ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(slotRef, {
      status: 'booked',
      appointmentId: appointmentRef.id,
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: 'assigned_by_owner',
      actorUid: params.ownerId,
      actorRole: 'owner',
      targetEmail: trimmedEmail,
      statusAfter: 'booked',
      note: trimmedName,
      createdAt: serverTimestamp(),
    });

    transaction.set(inAppNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: trimmedEmail,
      recipientEmailKey: participantEmailKey,
      channel: 'in_app',
      type: 'slot_assigned',
      title: content.title,
      body: content.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    transaction.set(emailNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: trimmedEmail,
      recipientEmailKey: participantEmailKey,
      channel: 'email',
      type: 'slot_assigned',
      title: content.title,
      body: content.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    return appointmentRef.id;
  });
}

export function subscribeToOwnerSlot(
  calendarId: string,
  slotId: string,
  onData: (slot: CalendarSlotRecord | null) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    calendarSlotDoc(calendarId, slotId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>));
    },
    onError
  );
}

export function subscribeToOwnerSlotEvents(
  calendarId: string,
  slotId: string,
  onData: (events: CalendarSlotEventRecord[]) => void,
  onError: (error: Error) => void
) {
  const eventsQuery = query(slotEventsCollection(calendarId, slotId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((documentSnapshot) =>
          mapSlotEvent(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
      );
    },
    onError
  );
}

export function subscribeToParticipantAppointments(
  email: string,
  onData: (appointments: AppointmentRecord[]) => void,
  onError: (error: Error) => void
) {
  const appointmentsQuery = query(
    collectionGroup(db, 'appointments'),
    where('participantEmailKey', '==', normalizeEmail(email))
  );

  return onSnapshot(
    appointmentsQuery,
    (snapshot) => {
      const appointments = snapshot.docs
        .map((documentSnapshot) =>
          mapAppointment(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
        )
        .filter((appointment) => appointment.status === 'booked')
        .sort((left, right) => {
          if (!left.startsAt || !right.startsAt) {
            return 0;
          }

          return left.startsAt.getTime() - right.startsAt.getTime();
        });

      onData(appointments);
    },
    onError
  );
}

export async function createAppointment(params: {
  calendarId: string;
  ownerId: string;
  participantEmail: string;
  startsAt: Date;
  endsAt: Date;
  createdByUserId: string;
  source: AppointmentRecord['source'];
  slotId?: string;
}) {
  const trimmedEmail = params.participantEmail.trim();

  if (!trimmedEmail) {
    throw new Error('Für den Termin ist eine E-Mail-Adresse erforderlich.');
  }

  const appointmentRef = await addDoc(calendarAppointmentsCollection(params.calendarId), {
    calendarId: params.calendarId,
    slotId: params.slotId ?? null,
    ownerId: params.ownerId,
    bookedByUserId: params.createdByUserId,
    bookedByEmail: trimmedEmail,
    bookedByEmailKey: normalizeEmail(trimmedEmail),
    participantEmail: trimmedEmail,
    participantEmailKey: normalizeEmail(trimmedEmail),
    startsAt: Timestamp.fromDate(params.startsAt),
    endsAt: Timestamp.fromDate(params.endsAt),
    source: params.source,
    status: 'booked',
    createdByUserId: params.createdByUserId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (params.source === 'manual') {
    const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

    if (calendarSnapshot.exists()) {
      const calendar = mapCalendar(
        calendarSnapshot.id,
        calendarSnapshot.data() as Record<string, unknown>
      );
      const content = buildNotificationContent({
        type: 'slot_assigned',
        ownerEmail: calendar.ownerEmail,
        startsAt: params.startsAt,
      });

      await createNotificationRecord({
        calendarId: params.calendarId,
        appointmentId: appointmentRef.id,
        slotId: params.slotId ?? null,
        recipientEmail: trimmedEmail,
        type: 'slot_assigned',
        channel: 'in_app',
        title: content.title,
        body: content.body,
      });
    }
  }

  return appointmentRef.id;
}

export async function bookSharedCalendarSlot(params: {
  calendarId: string;
  slotId: string;
  bookedByUid: string;
  bookedByEmail: string;
}) {
  const trimmedEmail = params.bookedByEmail.trim();

  if (!trimmedEmail) {
    throw new Error('Für die Buchung ist eine E-Mail-Adresse erforderlich.');
  }

  const bookedByEmailKey = normalizeEmail(trimmedEmail);
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const calendarRef = calendarDoc(params.calendarId);
  const accessRef = doc(calendarAccessCollection(params.calendarId), bookedByEmailKey);
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));
  const ownerInAppNotificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const ownerEmailNotificationRef = doc(calendarNotificationsCollection(params.calendarId));

  return runTransaction(db, async (transaction) => {
    const [calendarSnapshot, accessSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(calendarRef),
      transaction.get(accessRef),
      transaction.get(slotRef),
    ]);

    if (!calendarSnapshot.exists()) {
    throw new Error('Der ausgewählte Kalender existiert nicht mehr.');
    }

    if (!accessSnapshot.exists() || accessSnapshot.data().status !== 'approved') {
      throw new Error('Du hast keinen Zugriff auf diesen Kalender.');
    }

    if (!slotSnapshot.exists()) {
    throw new Error('Der ausgewählte Slot existiert nicht mehr.');
    }

    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (calendar.ownerId === params.bookedByUid) {
    throw new Error('Eigene Slots können nicht über diese Ansicht gebucht werden.');
    }

    if (!slot.startsAt || !slot.endsAt) {
    throw new Error('Für diesen Slot fehlen gültige Zeitangaben.');
    }

    if (slot.status !== 'available' || slot.appointmentId) {
    throw new Error('Dieser Slot ist nicht mehr verfügbar.');
    }

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      ownerId: calendar.ownerId,
      bookedByUserId: params.bookedByUid,
      participantName: null,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey,
      participantEmail: trimmedEmail,
      participantEmailKey: bookedByEmailKey,
      guestBooking: false,
      accountCreationRequested: false,
      startsAt: Timestamp.fromDate(slot.startsAt),
      endsAt: Timestamp.fromDate(slot.endsAt),
      source: 'self_service',
      status: 'booked',
      createdByUserId: params.bookedByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(slotRef, {
      status: 'booked',
      appointmentId: appointmentRef.id,
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: 'booked',
      actorUid: params.bookedByUid,
      actorRole: 'contact',
      targetEmail: trimmedEmail,
      statusAfter: 'booked',
      note: null,
      createdAt: serverTimestamp(),
    });

    const ownerContent = buildNotificationContent({
      type: 'booking_created',
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
    });

    transaction.set(ownerInAppNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: calendar.ownerEmail,
      recipientEmailKey: calendar.ownerEmailKey,
      channel: 'in_app',
      type: 'booking_created',
      title: ownerContent.title,
      body: ownerContent.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    transaction.set(ownerEmailNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: calendar.ownerEmail,
      recipientEmailKey: calendar.ownerEmailKey,
      channel: 'email',
      type: 'booking_created',
      title: ownerContent.title,
      body: ownerContent.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    return appointmentRef.id;
  });
}

export async function bookPublicCalendarSlot(params: {
  calendarId: string;
  slotId: string;
  participantName: string;
  participantEmail: string;
  requestAccountCreation: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}) {
  const trimmedName = params.participantName.trim();
  const trimmedEmail = params.participantEmail.trim();

  if (!trimmedName) {
    throw new Error('Ein Name ist erforderlich.');
  }

  if (!trimmedEmail) {
    throw new Error('Eine E-Mail ist erforderlich.');
  }

  if (!params.termsAccepted || !params.privacyAccepted) {
    throw new Error('Bitte akzeptiere vor der Buchung die AGB und die Datenschutzerklärung.');
  }

  const participantEmailKey = normalizeEmail(trimmedEmail);
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const calendarRef = calendarDoc(params.calendarId);
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));
  const ownerNotificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const guestNotificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const accountInviteNotificationRef = doc(calendarNotificationsCollection(params.calendarId));

  return runTransaction(db, async (transaction) => {
    const [calendarSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(calendarRef),
      transaction.get(slotRef),
    ]);

    if (!calendarSnapshot.exists()) {
    throw new Error('Der ausgewählte Kalender existiert nicht mehr.');
    }

    if (!slotSnapshot.exists()) {
    throw new Error('Der ausgewählte Slot existiert nicht mehr.');
    }

    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (calendar.visibility !== 'public') {
    throw new Error('Dieser Kalender kann nicht öffentlich gebucht werden.');
    }

    if (!slot.startsAt || !slot.endsAt) {
    throw new Error('Für diesen Slot fehlen gültige Zeitangaben.');
    }

    if (slot.status !== 'available' || slot.appointmentId) {
    throw new Error('Dieser Slot ist nicht mehr verfügbar.');
    }

    const ownerContent = buildNotificationContent({
      type: 'booking_created',
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
    });
    const guestContent = buildNotificationContent({
      type: 'booking_confirmation',
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
    });
    const accountInviteContent = buildNotificationContent({
      type: 'account_creation_invite',
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
    });

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      ownerId: calendar.ownerId,
      bookedByUserId: null,
      participantName: trimmedName,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey: participantEmailKey,
      participantEmail: trimmedEmail,
      participantEmailKey,
      guestBooking: true,
      accountCreationRequested: params.requestAccountCreation,
      termsAccepted: true,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: TERMS_VERSION,
      privacyAccepted: true,
      privacyAcceptedAt: serverTimestamp(),
      privacyVersion: PRIVACY_VERSION,
      startsAt: Timestamp.fromDate(slot.startsAt),
      endsAt: Timestamp.fromDate(slot.endsAt),
      source: 'self_service',
      status: 'booked',
      createdByUserId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(slotRef, {
      status: 'booked',
      appointmentId: appointmentRef.id,
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: 'booked',
      actorUid: null,
      actorRole: 'contact',
      targetEmail: trimmedEmail,
      statusAfter: 'booked',
      note: trimmedName,
      createdAt: serverTimestamp(),
    });

    transaction.set(ownerNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: calendar.ownerEmail,
      recipientEmailKey: calendar.ownerEmailKey,
      channel: 'in_app',
      type: 'booking_created',
      title: ownerContent.title,
      body: ownerContent.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    transaction.set(guestNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: trimmedEmail,
      recipientEmailKey: participantEmailKey,
      channel: 'email',
      type: 'booking_confirmation',
      title: guestContent.title,
      body: guestContent.body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    if (params.requestAccountCreation) {
      transaction.set(accountInviteNotificationRef, {
        calendarId: params.calendarId,
        appointmentId: appointmentRef.id,
        slotId: params.slotId,
        recipientEmail: trimmedEmail,
        recipientEmailKey: participantEmailKey,
        channel: 'email',
        type: 'account_creation_invite',
        title: accountInviteContent.title,
        body: accountInviteContent.body,
        dedupeKey: null,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        readAt: null,
      });
    }

    return appointmentRef.id;
  });
}

export async function cancelAppointmentByOwner(params: {
  calendarId: string;
  appointmentId: string;
  ownerId: string;
  nextSlotStatus: 'available' | 'inactive';
  cancellationMessage?: string | null;
}) {
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId), params.appointmentId);
  const inAppNotificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const emailNotificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

  if (!calendarSnapshot.exists()) {
    throw new Error('Der zugehörige Kalender existiert nicht mehr.');
  }

  const calendar = mapCalendar(
    calendarSnapshot.id,
    calendarSnapshot.data() as Record<string, unknown>
  );
  const trimmedCancellationMessage = params.cancellationMessage?.trim() ?? '';

  await runTransaction(db, async (transaction) => {
    const appointmentSnapshot = await transaction.get(appointmentRef);

    if (!appointmentSnapshot.exists()) {
      throw new Error('Der Termin existiert nicht mehr.');
    }

    const appointment = mapAppointment(
      appointmentSnapshot.id,
      appointmentSnapshot.data() as Record<string, unknown>
    );
    const slotRef = appointment.slotId
      ? calendarSlotDoc(params.calendarId, appointment.slotId)
      : null;
    const slotSnapshot = slotRef ? await transaction.get(slotRef) : null;
    const content = buildNotificationContent({
      type: 'slot_cancelled',
      ownerEmail: calendar.ownerEmail,
      startsAt: appointment.startsAt,
    });
    const notificationBody = trimmedCancellationMessage
      ? `${content.body}\n\n${trimmedCancellationMessage}`
      : content.body;

    if (appointment.status === 'cancelled') {
      throw new Error('Der Termin wurde bereits storniert.');
    }

    if (appointment.slotId && (!slotSnapshot || !slotSnapshot.exists())) {
      throw new Error('Der zugehörige Slot existiert nicht mehr.');
    }

    transaction.update(appointmentRef, {
      status: 'cancelled',
      cancelledByUserId: params.ownerId,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (slotRef && slotSnapshot?.exists()) {
      transaction.update(slotRef, {
        status: params.nextSlotStatus,
        appointmentId: null,
        updatedAt: serverTimestamp(),
      });

      transaction.set(doc(slotEventsCollection(params.calendarId, appointment.slotId!)), {
        calendarId: params.calendarId,
        slotId: appointment.slotId,
        type: 'cancelled_by_owner',
        actorUid: params.ownerId,
        actorRole: 'owner',
        targetEmail: appointment.participantEmail,
        statusAfter: params.nextSlotStatus,
        note: trimmedCancellationMessage || null,
        createdAt: serverTimestamp(),
      });
    }

    transaction.set(inAppNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: params.appointmentId,
      slotId: appointment.slotId ?? null,
      recipientEmail: appointment.participantEmail,
      recipientEmailKey: appointment.participantEmailKey,
      channel: 'in_app',
      type: 'slot_cancelled',
      title: content.title,
      body: notificationBody,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    transaction.set(emailNotificationRef, {
      calendarId: params.calendarId,
      appointmentId: params.appointmentId,
      slotId: appointment.slotId ?? null,
      recipientEmail: appointment.participantEmail,
      recipientEmailKey: appointment.participantEmailKey,
      channel: 'email',
      type: 'slot_cancelled',
      title: content.title,
      body: notificationBody,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });
  });
}

export async function createNotificationRecord(params: {
  calendarId: string;
  recipientEmail: string;
  recipientEmailKey?: string;
  type: NotificationRecord['type'];
  channel: NotificationRecord['channel'];
  appointmentId?: string;
  slotId?: string | null;
  title?: string;
  body?: string;
  dedupeKey?: string | null;
}) {
  const trimmedEmail = params.recipientEmail.trim();

  if (!trimmedEmail) {
    throw new Error('Für die Benachrichtigung ist eine E-Mail-Adresse erforderlich.');
  }

  const content = buildNotificationContent({
    type: params.type,
  });

  await addDoc(calendarNotificationsCollection(params.calendarId), {
    calendarId: params.calendarId,
    appointmentId: params.appointmentId ?? null,
    slotId: params.slotId ?? null,
    recipientEmail: trimmedEmail,
    recipientEmailKey: params.recipientEmailKey ?? normalizeEmail(trimmedEmail),
    channel: params.channel,
    type: params.type,
    title: params.title ?? content.title,
    body: params.body ?? content.body,
    dedupeKey: params.dedupeKey ?? null,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    readAt: null,
  });
}

export async function upsertOwnerDeviceToken(params: {
  ownerUid: string;
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web';
}) {
  const tokenRef = doc(ownerDevicesCollection(params.ownerUid), params.expoPushToken);

  await setDoc(
    tokenRef,
    {
      ownerUid: params.ownerUid,
      expoPushToken: params.expoPushToken,
      platform: params.platform,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
