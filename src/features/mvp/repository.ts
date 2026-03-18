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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

function mapAccess(id: string, data: Record<string, unknown>): CalendarAccessRecord {
  return {
    id,
    calendarId: String(data.calendarId ?? ''),
    ownerId: String(data.ownerId ?? ''),
    granteeEmail: String(data.granteeEmail ?? ''),
    granteeEmailKey: String(data.granteeEmailKey ?? ''),
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

export async function ensureOwnerAccountSetup(params: { uid: string; email: string }) {
  const trimmedEmail = params.email.trim();

  if (!trimmedEmail) {
    throw new Error('A signed-in user email is required to initialize calendar data.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const calendarId = params.uid;
  const ownerRef = ownerDoc(params.uid);
  const ownCalendarRef = calendarDoc(calendarId);

  await runTransaction(db, async (transaction) => {
    const [ownerSnapshot, calendarSnapshot] = await Promise.all([
      transaction.get(ownerRef),
      transaction.get(ownCalendarRef),
    ]);

    if (!ownerSnapshot.exists()) {
      transaction.set(ownerRef, {
        uid: params.uid,
        email: trimmedEmail,
        emailKey,
        calendarId,
        primaryIdentityType: 'email',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(
        ownerRef,
        {
          email: trimmedEmail,
          emailKey,
          calendarId,
          primaryIdentityType: 'email',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (!calendarSnapshot.exists()) {
      transaction.set(ownCalendarRef, {
        ownerId: params.uid,
        ownerEmail: trimmedEmail,
        ownerEmailKey: emailKey,
        visibility: 'restricted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(
        ownCalendarRef,
        {
          ownerId: params.uid,
          ownerEmail: trimmedEmail,
          ownerEmailKey: emailKey,
          visibility: 'restricted',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  return { calendarId };
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
  return onSnapshot(
    calendarDoc(ownerId),
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
  const accessQuery = query(
    collectionGroup(db, 'access'),
    where('granteeEmailKey', '==', normalizeEmail(email)),
    where('status', '==', 'approved')
  );
  const snapshots = await getDocs(accessQuery);

  return snapshots.docs.map((snapshot) =>
    mapAccess(snapshot.id, snapshot.data() as Record<string, unknown>)
  );
}

export async function listJoinedCalendars(email: string) {
  const accessRecords = await listApprovedCalendarAccess(email);
  const uniqueCalendarIds = Array.from(
    new Set(accessRecords.map((record) => record.calendarId).filter(Boolean))
  );

  const calendarSnapshots = await Promise.all(
    uniqueCalendarIds.map(async (calendarId) => {
      const snapshot = await getDoc(calendarDoc(calendarId));
      return snapshot.exists()
        ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>)
        : null;
    })
  );

  return calendarSnapshots.filter((calendar): calendar is CalendarRecord => calendar !== null);
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

export async function getDashboardData(params: { uid: string; email: string }) {
  await ensureOwnerAccountSetup(params);

  const [ownerProfile, ownerCalendar, joinedCalendars, upcomingAppointments] = await Promise.all([
    getOwnerProfile(params.uid),
    getOwnerCalendar(params.uid),
    listJoinedCalendars(params.email),
    listUpcomingAppointmentsForParticipant(params.email),
  ]);

  return {
    ownerProfile,
    ownerCalendar,
    joinedCalendars,
    upcomingAppointments,
  } satisfies DashboardData;
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

  return appointmentRef.id;
}

export async function cancelAppointmentByOwner(params: {
  calendarId: string;
  appointmentId: string;
  ownerId: string;
}) {
  await updateDoc(doc(calendarAppointmentsCollection(params.calendarId), params.appointmentId), {
    status: 'cancelled',
    cancelledByUserId: params.ownerId,
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createNotificationRecord(params: {
  calendarId: string;
  recipientEmail: string;
  type: NotificationRecord['type'];
  channel: NotificationRecord['channel'];
  appointmentId?: string;
}) {
  const trimmedEmail = params.recipientEmail.trim();

  if (!trimmedEmail) {
    throw new Error('A recipient email is required.');
  }

  await addDoc(calendarNotificationsCollection(params.calendarId), {
    calendarId: params.calendarId,
    appointmentId: params.appointmentId ?? null,
    recipientEmail: trimmedEmail,
    channel: params.channel,
    type: params.type,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
