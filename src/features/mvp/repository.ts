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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';

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

export class DashboardDataLoadError extends Error {
  debug: NonNullable<DashboardData['debug']>;

  constructor(message: string, debug: NonNullable<DashboardData['debug']>) {
    super(message);
    this.name = 'DashboardDataLoadError';
    this.debug = debug;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isMissingFirestoreIndexError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.toLowerCase().includes('requires an index') ||
    error.message.toLowerCase().includes('failed-precondition')
  );
}

function getDashboardLoadErrorMessage(error: unknown) {
  if (isMissingFirestoreIndexError(error)) {
    return 'Der Firestore-Index fuer die access-collectionGroup fehlt noch.';
  }

  return error instanceof Error ? error.message : 'Dashboard data could not be loaded.';
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

function calendarDoc(calendarId: string) {
  return doc(db, 'calendars', calendarId);
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

const ownerSetupInFlight = new Map<string, Promise<{ calendarId: string }>>();

function mapOwnerProfile(id: string, data: Record<string, unknown>): OwnerProfile {
  return {
    uid: String(data.uid ?? id),
    email: String(data.email ?? ''),
    emailKey: String(data.emailKey ?? ''),
    calendarId: String(data.calendarId ?? id),
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
    visibility: 'restricted',
    notifyOnNewSlotsAvailable: Boolean(data.notifyOnNewSlotsAvailable),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
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
    requesterEmail: String(data.requesterEmail ?? ''),
    requesterEmailKey: String(data.requesterEmailKey ?? ''),
    status:
      data.status === 'approved'
        ? 'approved'
        : data.status === 'rejected'
          ? 'rejected'
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
    bookedByUserId: String(data.bookedByUserId ?? data.createdByUserId ?? ''),
    bookedByEmail: String(data.bookedByEmail ?? data.participantEmail ?? ''),
    bookedByEmailKey: String(data.bookedByEmailKey ?? data.participantEmailKey ?? ''),
    participantEmail: String(data.participantEmail ?? ''),
    participantEmailKey: String(data.participantEmailKey ?? ''),
    startsAt: asDate(data.startsAt),
    endsAt: asDate(data.endsAt),
    source: data.source === 'manual' ? 'manual' : 'self_service',
    status: data.status === 'cancelled' ? 'cancelled' : 'booked',
    createdByUserId: String(data.createdByUserId ?? ''),
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
      data.status === 'booked' ? 'booked' : data.status === 'cancelled' ? 'cancelled' : 'available',
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
      data.type === 'booked' ||
      data.type === 'assigned_by_owner' ||
      data.type === 'cancelled_by_owner' ||
      data.type === 'released' ||
      data.type === 'updated'
        ? data.type
        : 'created',
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : null,
    actorRole:
      data.actorRole === 'contact' || data.actorRole === 'system' ? data.actorRole : 'owner',
    targetEmail: typeof data.targetEmail === 'string' ? data.targetEmail : null,
    statusAfter:
      data.statusAfter === 'booked' || data.statusAfter === 'cancelled'
        ? data.statusAfter
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
      data.type === 'appointment_assigned' ||
      data.type === 'appointment_cancelled'
        ? data.type
        : 'booking_created',
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    dedupeKey: typeof data.dedupeKey === 'string' ? data.dedupeKey : null,
    status:
      data.status === 'sent' || data.status === 'failed' || data.status === 'read'
        ? data.status
        : 'pending',
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
    }) ?? 'Zeitpunkt nicht verfuegbar';

  switch (params.type) {
    case 'slot_assigned':
      return {
        title: 'Slotzeit erhalten',
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
    default:
      return {
        title: 'Neue Buchung',
        body: `${ownerLabel} hat eine neue Buchung erhalten`,
      };
  }
}

export async function ensureOwnerAccountSetup(params: { uid: string; email: string }) {
  const trimmedEmail = params.email.trim();

  if (!trimmedEmail) {
    throw new Error('A signed-in user email is required to initialize calendar data.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const calendarId = params.uid;
  const ownerRef = ownerDoc(params.uid);
  const ownCalendarRef = calendarDoc(calendarId);
  const setupKey = `${params.uid}:${emailKey}`;
  const existingSetupPromise = ownerSetupInFlight.get(setupKey);

  if (existingSetupPromise) {
    console.log('ensureOwnerAccountSetup:reuse', {
      uid: params.uid,
      emailKey,
    });
    return existingSetupPromise;
  }

  console.log('ensureOwnerAccountSetup:start', {
    uid: params.uid,
    emailKey,
  });

  const setupPromise = (async () => {
    const [ownerSnapshot, calendarSnapshot] = await Promise.all([
      getDoc(ownerRef),
      getDoc(ownCalendarRef),
    ]);

    await Promise.all([
      setDoc(
        ownerRef,
        {
          uid: params.uid,
          email: trimmedEmail,
          emailKey,
          calendarId,
          primaryIdentityType: 'email',
          ...(ownerSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      setDoc(
        ownCalendarRef,
        {
          ownerId: params.uid,
          ownerEmail: trimmedEmail,
          ownerEmailKey: emailKey,
          visibility: 'restricted',
          ...(calendarSnapshot.exists()
            ? {}
            : {
                notifyOnNewSlotsAvailable: false,
                createdAt: serverTimestamp(),
              }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]);

    console.log('ensureOwnerAccountSetup:success', {
      uid: params.uid,
      emailKey,
      ownerExistsBefore: ownerSnapshot.exists(),
      calendarExistsBefore: calendarSnapshot.exists(),
    });

    return { calendarId };
  })();

  ownerSetupInFlight.set(setupKey, setupPromise);

  try {
    return await setupPromise;
  } catch (error) {
    console.log('ensureOwnerAccountSetup:error', {
      uid: params.uid,
      emailKey,
      error,
    });
    throw error;
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

  console.log('listApprovedCalendarAccess:direct', {
    email,
    normalizedEmailKey,
    count: directSnapshots.docs.length,
    docs: directSnapshots.docs.map((snapshot) => ({
      id: snapshot.id,
      data: snapshot.data(),
    })),
  });

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

  console.log('listApprovedCalendarAccess:fallback', {
    email,
    normalizedEmailKey,
    scannedCount: fallbackSnapshots.docs.length,
    matchingRecords,
  });

  return Array.from(
    new Map(
      matchingRecords.map((record) => [`${record.calendarId}:${record.granteeEmailKey}`, record])
    ).values()
  );
}

async function getJoinedCalendarsWithDebug(email: string) {
  const accessRecords = await listApprovedCalendarAccess(email);
  const uniqueCalendarIds = Array.from(
    new Set(accessRecords.map((record) => record.calendarId).filter(Boolean))
  );

  console.log('listJoinedCalendars:accessRecords', {
    email,
    accessRecords,
    uniqueCalendarIds,
  });

  const calendarSnapshots = await Promise.all(
    uniqueCalendarIds.map(async (calendarId) => {
      try {
        const snapshot = await getDoc(calendarDoc(calendarId));
        const mappedCalendar = snapshot.exists()
          ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>)
          : null;

        console.log('listJoinedCalendars:calendarRead', {
          calendarId,
          exists: snapshot.exists(),
          calendar: mappedCalendar,
        });

        return mappedCalendar;
      } catch (error) {
        console.log('listJoinedCalendars:calendarReadError', {
          calendarId,
          error,
        });
        throw error;
      }
    })
  );

  console.log('listJoinedCalendars:result', {
    email,
    calendars: calendarSnapshots,
  });

  const joinedCalendars = calendarSnapshots.filter(
    (calendar): calendar is CalendarRecord => calendar !== null
  );

  return {
    accessRecords,
    uniqueCalendarIds,
    joinedCalendars,
  };
}

export async function listJoinedCalendars(email: string) {
  const result = await getJoinedCalendarsWithDebug(email);
  return result.joinedCalendars;
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
  const baseDebug: NonNullable<DashboardData['debug']> = {
    currentEmail: params.email,
    normalizedEmail: normalizeEmail(params.email),
    ownerSetupOk: true,
    accessRecordsCount: 0,
    accessRecords: [],
    calendarIds: [],
    joinedCalendarsCount: 0,
    joinedCalendarIds: [],
    errorMessage: null,
  };

  try {
    const joinedCalendarDebug = await getJoinedCalendarsWithDebug(params.email);

    const [
      ownerProfile,
      ownerCalendar,
      upcomingAppointments,
      recentNotifications,
    ] = await Promise.all([
      getOwnerProfile(params.uid),
      getOwnerCalendar(params.uid),
      listUpcomingAppointmentsForParticipant(params.email),
      listRecentNotificationsForRecipient(params.email),
    ]);

    return {
      ownerProfile,
      ownerCalendar,
      joinedCalendars: joinedCalendarDebug.joinedCalendars,
      upcomingAppointments,
      recentNotifications,
      debug: {
        ...baseDebug,
        accessRecordsCount: joinedCalendarDebug.accessRecords.length,
        accessRecords: joinedCalendarDebug.accessRecords.map((record) => ({
          calendarId: record.calendarId,
          status: record.status,
          granteeEmailKey: record.granteeEmailKey,
        })),
        calendarIds: joinedCalendarDebug.uniqueCalendarIds,
        joinedCalendarsCount: joinedCalendarDebug.joinedCalendars.length,
        joinedCalendarIds: joinedCalendarDebug.joinedCalendars.map((calendar) => calendar.id),
      },
    } satisfies DashboardData;
  } catch (error) {
    throw new DashboardDataLoadError(getDashboardLoadErrorMessage(error), {
      ...baseDebug,
      errorMessage: getDashboardLoadErrorMessage(error),
    });
  }
}

export async function upsertCalendarAccess(params: {
  calendarId: string;
  ownerId: string;
  granteeEmail: string;
  status?: CalendarAccessRecord['status'];
}) {
  const trimmedEmail = params.granteeEmail.trim();

  if (!trimmedEmail) {
    throw new Error('A grantee email is required.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const accessRef = doc(calendarAccessCollection(params.calendarId), emailKey);

  await setDoc(
    accessRef,
    {
      calendarId: params.calendarId,
      ownerId: params.ownerId,
      granteeEmail: trimmedEmail,
      granteeEmailKey: emailKey,
      status: params.status ?? 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function upsertCalendarAccessRequest(params: {
  calendarId: string;
  requesterEmail: string;
  status?: CalendarAccessRequestRecord['status'];
}) {
  const trimmedEmail = params.requesterEmail.trim();

  if (!trimmedEmail) {
    throw new Error('A requester email is required.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const requestRef = doc(calendarRequestsCollection(params.calendarId), emailKey);

  await setDoc(
    requestRef,
    {
      calendarId: params.calendarId,
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

export async function requestCalendarAccessByOwnerEmail(params: {
  ownerEmail: string;
  requesterEmail: string;
}) {
  const trimmedOwnerEmail = params.ownerEmail.trim();
  const trimmedRequesterEmail = params.requesterEmail.trim();

  if (!trimmedOwnerEmail) {
    throw new Error('Eine Inhaber-E-Mail ist erforderlich.');
  }

  if (!trimmedRequesterEmail) {
    throw new Error('Eine eigene E-Mail ist erforderlich.');
  }

  const ownerEmailKey = normalizeEmail(trimmedOwnerEmail);
  const requesterEmailKey = normalizeEmail(trimmedRequesterEmail);

  if (ownerEmailKey === requesterEmailKey) {
    throw new Error('Fuer den eigenen Kalender muss keine Zugriffsanfrage gestellt werden.');
  }

  const calendarsQuery = query(
    collection(db, 'calendars'),
    where('ownerEmailKey', '==', ownerEmailKey),
    limit(1)
  );
  const calendarSnapshots = await getDocs(calendarsQuery);

  if (!calendarSnapshots.docs.length) {
    throw new Error('Zu dieser E-Mail wurde kein Kalender gefunden.');
  }

  const calendarSnapshot = calendarSnapshots.docs[0];
  const calendar = mapCalendar(
    calendarSnapshot.id,
    calendarSnapshot.data() as Record<string, unknown>
  );

  const existingAccessSnapshot = await getDoc(
    doc(calendarAccessCollection(calendar.id), requesterEmailKey)
  );

  if (
    existingAccessSnapshot.exists() &&
    existingAccessSnapshot.data().status === 'approved'
  ) {
    throw new Error('Du hast bereits Zugriff auf diesen Kalender.');
  }

  if (calendar.visibility !== 'restricted') {
    throw new Error('Nur eingeschraenkte Kalender verwenden derzeit die Anfrage-Logik.');
  }

  await upsertCalendarAccessRequest({
    calendarId: calendar.id,
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
    throw new Error('Eine Anfrage-E-Mail ist erforderlich.');
  }

  const requesterEmailKey = normalizeEmail(trimmedRequesterEmail);
  const accessRef = doc(calendarAccessCollection(params.calendarId), requesterEmailKey);
  const requestRef = doc(calendarRequestsCollection(params.calendarId), requesterEmailKey);

  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists()) {
      throw new Error('Die ausgewaehlte Anfrage existiert nicht mehr.');
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
      requestRef,
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
    throw new Error('Eine Anfrage-E-Mail ist erforderlich.');
  }

  const requesterEmailKey = normalizeEmail(trimmedRequesterEmail);
  const requestRef = doc(calendarRequestsCollection(params.calendarId), requesterEmailKey);

  await setDoc(
    requestRef,
    {
      status: 'rejected',
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
    throw new Error('Slot end must be after slot start.');
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
    throw new Error('Slot end must be after slot start.');
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
      throw new Error('Der Kalender ist nicht mehr verfuegbar.');
    }

    if (!accessSnapshot.exists() || accessSnapshot.data().status !== 'approved') {
      throw new Error('Die ausgewaehlte Person ist aktuell nicht freigegeben.');
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
    throw new Error('No valid slots could be generated from the selected range.');
  }

  const batch = writeBatch(db);

  for (const slotWindow of params.slots) {
    if (slotWindow.endsAt <= slotWindow.startsAt) {
      throw new Error('Slot end must be after slot start.');
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

export async function cancelCalendarSlot(params: {
  calendarId: string;
  slotId: string;
  actorUid?: string;
}) {
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));

  return runTransaction<
    'cancelled' | 'already_cancelled'
  >(db, async (transaction) => {
    const snapshot = await transaction.get(slotRef);

    if (!snapshot.exists()) {
      throw new Error('The selected slot no longer exists.');
    }

    const slot = mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
      throw new Error('Booked slots cannot be removed.');
    }

    if (slot.status === 'cancelled') {
      return 'already_cancelled';
    }

    transaction.update(slotRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });

    transaction.set(eventRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      type: 'cancelled_by_owner',
      actorUid: params.actorUid ?? null,
      actorRole: 'owner',
      targetEmail: null,
      statusAfter: 'cancelled',
      note: null,
      createdAt: serverTimestamp(),
    });

    return 'cancelled';
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
    throw new Error('A participant email is required.');
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
    throw new Error('Eine E-Mail fuer die Buchung ist erforderlich.');
  }

  const bookedByEmailKey = normalizeEmail(trimmedEmail);
  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const calendarRef = calendarDoc(params.calendarId);
  const accessRef = doc(calendarAccessCollection(params.calendarId), bookedByEmailKey);
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));
  const notificationRef = doc(calendarNotificationsCollection(params.calendarId));

  return runTransaction(db, async (transaction) => {
    const [calendarSnapshot, accessSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(calendarRef),
      transaction.get(accessRef),
      transaction.get(slotRef),
    ]);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Kalender existiert nicht mehr.');
    }

    if (!accessSnapshot.exists() || accessSnapshot.data().status !== 'approved') {
      throw new Error('Du hast keinen Zugriff auf diesen Kalender.');
    }

    if (!slotSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
    }

    const calendar = mapCalendar(
      calendarSnapshot.id,
      calendarSnapshot.data() as Record<string, unknown>
    );
    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (calendar.ownerId === params.bookedByUid) {
      throw new Error('Eigene Slots werden nicht ueber den Fremdnutzer-Flow gebucht.');
    }

    if (!slot.startsAt || !slot.endsAt) {
      throw new Error('Dem Slot fehlen gueltige Zeitdaten.');
    }

    if (slot.status !== 'available' || slot.appointmentId) {
      throw new Error('Dieser Slot ist nicht mehr verfuegbar.');
    }

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      ownerId: calendar.ownerId,
      bookedByUserId: params.bookedByUid,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey,
      participantEmail: trimmedEmail,
      participantEmailKey: bookedByEmailKey,
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

    transaction.set(notificationRef, {
      calendarId: params.calendarId,
      appointmentId: appointmentRef.id,
      slotId: params.slotId,
      recipientEmail: calendar.ownerEmail,
      recipientEmailKey: calendar.ownerEmailKey,
      channel: 'in_app',
      type: 'booking_created',
      title: buildNotificationContent({
        type: 'booking_created',
        ownerEmail: calendar.ownerEmail,
      }).title,
      body: buildNotificationContent({
        type: 'booking_created',
        ownerEmail: calendar.ownerEmail,
      }).body,
      dedupeKey: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    });

    return appointmentRef.id;
  });
}

export async function cancelAppointmentByOwner(params: {
  calendarId: string;
  appointmentId: string;
  ownerId: string;
}) {
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId), params.appointmentId);
  const notificationRef = doc(calendarNotificationsCollection(params.calendarId));
  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

  if (!calendarSnapshot.exists()) {
    throw new Error('Der zugehoerige Kalender existiert nicht mehr.');
  }

  const calendar = mapCalendar(
    calendarSnapshot.id,
    calendarSnapshot.data() as Record<string, unknown>
  );

  await runTransaction(db, async (transaction) => {
    const appointmentSnapshot = await transaction.get(appointmentRef);

    if (!appointmentSnapshot.exists()) {
      throw new Error('Der Termin existiert nicht mehr.');
    }

    const appointment = mapAppointment(
      appointmentSnapshot.id,
      appointmentSnapshot.data() as Record<string, unknown>
    );
    const content = buildNotificationContent({
      type: 'slot_cancelled',
      ownerEmail: calendar.ownerEmail,
      startsAt: appointment.startsAt,
    });

    transaction.update(appointmentRef, {
      status: 'cancelled',
      cancelledByUserId: params.ownerId,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      calendarId: params.calendarId,
      appointmentId: params.appointmentId,
      slotId: appointment.slotId ?? null,
      recipientEmail: appointment.participantEmail,
      recipientEmailKey: appointment.participantEmailKey,
      channel: 'in_app',
      type: 'slot_cancelled',
      title: content.title,
      body: content.body,
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
    throw new Error('A recipient email is required.');
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
