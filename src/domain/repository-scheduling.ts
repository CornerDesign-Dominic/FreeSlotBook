import {
  addDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  collectionGroup,
  type Query,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';

import type {
  AppointmentRecord,
  CalendarSlotEventRecord,
  CalendarSlotRecord,
  NotificationRecord,
} from './types';
import { findOverlappingSlots } from './calendar-utils';
import { PRIVACY_VERSION, TERMS_VERSION } from './types';
import {
  buildNotificationContent,
  calendarAccessCollection,
  calendarAccessDoc,
  calendarAppointmentsCollection,
  calendarDoc,
  calendarSlotDoc,
  calendarSlotsCollection,
  mapAppointment,
  mapCalendar,
  mapSlot,
  mapSlotEvent,
  normalizeEmail,
  notificationCollection,
  notificationDoc,
  slotEventsCollection,
  userDevicesCollection,
  validateOptionalPhoneNumber,
} from './repository-shared';
import { getOwnerProfile, getUserProfileByEmail } from './repository-core';

async function listOverlappingSlots(
  calendarId: string,
  windows: { startsAt: Date; endsAt: Date }[],
  excludeSlotIds: string[] = []
) {
  const snapshots = await getDocs(query(calendarSlotsCollection(calendarId), orderBy('startsAt', 'asc')));
  const slots = snapshots.docs.map((documentSnapshot) =>
    mapSlot(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
  );

  return findOverlappingSlots(slots, windows, { excludeSlotIds });
}

async function createNotification(params: {
  calendarId: string;
  recipientUid?: string | null;
  recipientEmail: string;
  type: NotificationRecord['type'];
  channel: NotificationRecord['channel'];
  appointmentId?: string | null;
  slotId?: string | null;
  title?: string;
  body?: string;
  dedupeKey?: string | null;
}) {
  const content = buildNotificationContent({ type: params.type });
  const targetRef = params.dedupeKey ? notificationDoc(params.dedupeKey) : doc(notificationCollection());

  await setDoc(
    targetRef,
    {
      calendarId: params.calendarId,
      appointmentId: params.appointmentId ?? null,
      slotId: params.slotId ?? null,
      recipientUid: params.recipientUid ?? null,
      recipientEmail: params.recipientEmail,
      recipientEmailKey: normalizeEmail(params.recipientEmail),
      channel: params.channel,
      type: params.type,
      title: params.title ?? content.title,
      body: params.body ?? content.body,
      dedupeKey: params.dedupeKey ?? null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readAt: null,
    },
    { merge: Boolean(params.dedupeKey) }
  );
}

async function queueNewSlotsAvailableNotifications(params: {
  calendarId: string;
  ownerEmail: string;
}) {
  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));

  if (!calendarSnapshot.exists()) {
    return 0;
  }

  const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);

  if (!calendar.notifyOnNewSlotsAvailable) {
    return 0;
  }

  const accessSnapshots = await getDocs(
    query(calendarAccessCollection(params.calendarId), where('role', '==', 'member'))
  );
  const today = new Date();
  const dayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
  let createdCount = 0;

  for (const snapshot of accessSnapshots.docs) {
    const access = snapshot.data() as Record<string, unknown>;
    const uid = typeof access.uid === 'string' ? access.uid : snapshot.id;
    const email = typeof access.email === 'string' ? access.email : '';
    const dedupeKey = `new_slots_available:${params.calendarId}:${uid}:${dayKey}`;
    const existingNotification = await getDoc(notificationDoc(dedupeKey));

    if (existingNotification.exists()) {
      continue;
    }

    const content = buildNotificationContent({
      type: 'new_slots_available',
      ownerEmail: params.ownerEmail,
    });

    await createNotification({
      calendarId: params.calendarId,
      recipientUid: uid,
      recipientEmail: email,
      type: 'new_slots_available',
      channel: 'in_app',
      title: content.title,
      body: content.body,
      dedupeKey,
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

  const overlappingSlotIds = await listOverlappingSlots(params.calendarId, [
    { startsAt: params.startsAt, endsAt: params.endsAt },
  ]);

  if (overlappingSlotIds.length) {
    throw new Error('Dieser Slot ueberschneidet sich mit einem bestehenden Slot.');
  }

  const slotRef = doc(calendarSlotsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, slotRef.id));

  await runTransaction(db, async (transaction) => {
    transaction.set(slotRef, {
      calendarId: params.calendarId,
      ownerUid: params.ownerId,
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
      targetUid: null,
      statusAfter: 'available',
      note: null,
      createdAt: serverTimestamp(),
    });
  });

  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));
  if (calendarSnapshot.exists()) {
    const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
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
    return createCalendarSlot(params);
  }

  const assignee = await getUserProfileByEmail(trimmedAssigneeEmail);

  if (!assignee) {
    throw new Error('Die ausgewaehlte Person konnte nicht gefunden werden.');
  }

  const membershipSnapshot = await getDoc(calendarAccessDoc(params.calendarId, assignee.uid));

  if (!membershipSnapshot.exists()) {
    throw new Error('Die ausgewaehlte Person ist aktuell kein Mitglied dieses Kalenders.');
  }

  return assignCalendarSlotByOwner({
    calendarId: params.calendarId,
    slotId: '',
    ownerId: params.ownerId,
    participantName: assignee.username ?? assignee.email,
    participantEmail: assignee.email,
    participantPhone: null,
    participantUid: assignee.uid,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    createNewSlot: true,
  });
}

export async function createCalendarSlotsBatch(params: {
  calendarId: string;
  ownerId: string;
  slots: { startsAt: Date; endsAt: Date }[];
}) {
  if (!params.slots.length) {
    throw new Error('Aus dem gewaehlten Zeitraum konnten keine gueltigen Slots erstellt werden.');
  }

  for (const slotWindow of params.slots) {
    if (slotWindow.endsAt <= slotWindow.startsAt) {
      throw new Error('Die Endzeit muss nach der Startzeit liegen.');
    }
  }

  const overlappingSlotIds = await listOverlappingSlots(params.calendarId, params.slots);

  if (overlappingSlotIds.length) {
    throw new Error('Mindestens ein Slot ueberschneidet sich mit einem bestehenden Slot.');
  }

  const batch = writeBatch(db);

  for (const slotWindow of params.slots) {
    const slotRef = doc(calendarSlotsCollection(params.calendarId));
    const eventRef = doc(slotEventsCollection(params.calendarId, slotRef.id));

    batch.set(slotRef, {
      calendarId: params.calendarId,
      ownerUid: params.ownerId,
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
      targetUid: null,
      statusAfter: 'available',
      note: null,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();

  const calendarSnapshot = await getDoc(calendarDoc(params.calendarId));
  if (calendarSnapshot.exists()) {
    const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
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
  return onSnapshot(
    query(calendarSlotsCollection(calendarId), orderBy('startsAt', 'asc')),
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
  return onSnapshot(
    query(
      calendarSlotsCollection(calendarId),
      where('startsAt', '<', Timestamp.fromDate(rangeEnd)),
      where('endsAt', '>', Timestamp.fromDate(rangeStart)),
      orderBy('startsAt', 'asc'),
      orderBy('endsAt', 'asc')
    ),
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

  return runTransaction<'inactive' | 'already_inactive'>(db, async (transaction) => {
    const snapshot = await transaction.get(slotRef);

    if (!snapshot.exists()) {
      throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
    }

    const slot = mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
      throw new Error('Gebuchte Slots koennen nicht deaktiviert werden.');
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
      targetUid: null,
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
      throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
    }

    const slot = mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
      throw new Error('Gebuchte Slots koennen nicht umgestellt werden.');
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
      targetUid: null,
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

  const overlappingSlotIds = await listOverlappingSlots(
    params.calendarId,
    [{ startsAt: params.startsAt, endsAt: params.endsAt }],
    [params.slotId]
  );

  if (overlappingSlotIds.length) {
    throw new Error('Dieser Slot ueberschneidet sich mit einem bestehenden Slot.');
  }

  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));

  return runTransaction<'updated' | 'unchanged'>(db, async (transaction) => {
    const snapshot = await transaction.get(slotRef);

    if (!snapshot.exists()) {
      throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
    }

    const slot = mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>);

    if (slot.status === 'booked' || slot.appointmentId) {
      throw new Error('Gebuchte Slots koennen zeitlich nicht bearbeitet werden.');
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
      targetUid: null,
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
  participantUid?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  createNewSlot?: boolean;
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

  if (params.createNewSlot) {
    if (!params.startsAt || !params.endsAt) {
      throw new Error('Fuer die direkte Zuweisung muessen gueltige Slotzeiten gesetzt sein.');
    }

    if (params.endsAt <= params.startsAt) {
      throw new Error('Die Endzeit muss nach der Startzeit liegen.');
    }

    const overlappingSlotIds = await listOverlappingSlots(params.calendarId, [
      { startsAt: params.startsAt, endsAt: params.endsAt },
    ]);

    if (overlappingSlotIds.length) {
      throw new Error('Dieser Slot ueberschneidet sich mit einem bestehenden Slot.');
    }
  }

  const participantEmailKey = normalizeEmail(trimmedEmail);
  const slotRef = params.createNewSlot
    ? doc(calendarSlotsCollection(params.calendarId))
    : calendarSlotDoc(params.calendarId, params.slotId);
  const eventRef = doc(slotEventsCollection(params.calendarId, slotRef.id));
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const calendarRef = calendarDoc(params.calendarId);

  return runTransaction(db, async (transaction) => {
    const calendarSnapshot = await transaction.get(calendarRef);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der Kalender ist nicht mehr verfuegbar.');
    }

    let startsAt = params.startsAt ?? null;
    let endsAt = params.endsAt ?? null;

    if (!params.createNewSlot) {
      const slotSnapshot = await transaction.get(slotRef);

      if (!slotSnapshot.exists()) {
        throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
      }

      const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

      if (!slot.startsAt || !slot.endsAt) {
        throw new Error('Fuer diesen Slot fehlen gueltige Zeitangaben.');
      }

      if (slot.status !== 'available' || slot.appointmentId) {
        throw new Error('Dieser Slot ist nicht mehr verfuegbar.');
      }

      startsAt = slot.startsAt;
      endsAt = slot.endsAt;
    }

    if (!startsAt || !endsAt) {
      throw new Error('Fuer diesen Slot fehlen gueltige Zeitangaben.');
    }

    if (params.createNewSlot) {
      transaction.set(slotRef, {
        calendarId: params.calendarId,
        ownerUid: params.ownerId,
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromDate(endsAt),
        status: 'booked',
        appointmentId: appointmentRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(slotRef, {
        status: 'booked',
        appointmentId: appointmentRef.id,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: slotRef.id,
      ownerUid: params.ownerId,
      participantUid: params.participantUid ?? null,
      bookedByUserId: params.participantUid ?? null,
      participantName: trimmedName,
      participantPhone: normalizedPhoneNumber,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey: participantEmailKey,
      participantEmail: trimmedEmail,
      participantEmailKey: participantEmailKey,
      guestBooking: !params.participantUid,
      accountCreationRequested: false,
      startsAt: Timestamp.fromDate(startsAt),
      endsAt: Timestamp.fromDate(endsAt),
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
      targetEmail: trimmedEmail,
      targetUid: params.participantUid ?? null,
      statusAfter: 'booked',
      note: trimmedName,
      createdAt: serverTimestamp(),
    });

    return appointmentRef.id;
  }).then(async (appointmentId) => {
    await Promise.all([
      createNotification({
        calendarId: params.calendarId,
        recipientUid: params.participantUid ?? null,
        recipientEmail: trimmedEmail,
        type: 'slot_assigned',
        channel: 'in_app',
        appointmentId,
        slotId: slotRef.id,
      }),
      createNotification({
        calendarId: params.calendarId,
        recipientUid: params.participantUid ?? null,
        recipientEmail: trimmedEmail,
        type: 'slot_assigned',
        channel: 'email',
        appointmentId,
        slotId: slotRef.id,
      }),
    ]);

    return appointmentId;
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
      onData(snapshot.exists() ? mapSlot(snapshot.id, snapshot.data() as Record<string, unknown>) : null);
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
  return onSnapshot(
    query(slotEventsCollection(calendarId, slotId), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onData(snapshot.docs.map((documentSnapshot) =>
        mapSlotEvent(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
      ));
    },
    onError
  );
}

export function subscribeToParticipantAppointments(
  participant: string | { uid?: string | null; email?: string | null },
  onData: (appointments: AppointmentRecord[]) => void,
  onError: (error: Error) => void
) {
  const participantUid = typeof participant === 'string' ? null : participant.uid ?? null;
  const participantEmail = typeof participant === 'string' ? participant : participant.email ?? null;
  const queries: Query[] = [];

  if (participantUid) {
    queries.push(
      query(collectionGroup(db, 'appointments'), where('participantUid', '==', participantUid))
    );
  }

  if (participantEmail) {
    queries.push(
      query(
        collectionGroup(db, 'appointments'),
        where('participantEmailKey', '==', normalizeEmail(participantEmail))
      )
    );
  }

  if (!queries.length) {
    onData([]);
    return () => undefined;
  }

  const unsubscribeHandles = queries.map((appointmentsQuery) =>
    onSnapshot(
      appointmentsQuery,
      () => {
        void (async () => {
          try {
            const snapshots = await Promise.all(queries.map((currentQuery) => getDocs(currentQuery)));
            const appointments = Array.from(
              new Map(
                snapshots
                  .flatMap((snapshot) => snapshot.docs)
                  .map((snapshot) => [
                    snapshot.ref.path,
                    mapAppointment(snapshot.id, snapshot.data() as Record<string, unknown>),
                  ])
              ).values()
            ).sort((left, right) => (left.startsAt?.getTime() ?? 0) - (right.startsAt?.getTime() ?? 0));

            onData(appointments);
          } catch (error) {
            onError(error instanceof Error ? error : new Error('Termine konnten nicht geladen werden.'));
          }
        })();
      },
      onError
    )
  );

  return () => {
    unsubscribeHandles.forEach((unsubscribe) => unsubscribe());
  };
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
    throw new Error('Fuer den Termin ist eine E-Mail-Adresse erforderlich.');
  }

  const appointmentRef = await addDoc(calendarAppointmentsCollection(params.calendarId), {
    calendarId: params.calendarId,
    slotId: params.slotId ?? null,
    ownerUid: params.ownerId,
    participantUid: null,
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
    await createNotification({
      calendarId: params.calendarId,
      recipientEmail: trimmedEmail,
      type: 'slot_assigned',
      channel: 'in_app',
      appointmentId: appointmentRef.id,
      slotId: params.slotId ?? null,
    });
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
    throw new Error('Fuer die Buchung ist eine E-Mail-Adresse erforderlich.');
  }

  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const calendarRef = calendarDoc(params.calendarId);
  const accessRef = calendarAccessDoc(params.calendarId, params.bookedByUid);
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));

  return runTransaction(db, async (transaction) => {
    const [calendarSnapshot, accessSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(calendarRef),
      transaction.get(accessRef),
      transaction.get(slotRef),
    ]);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Kalender existiert nicht mehr.');
    }

    if (!accessSnapshot.exists()) {
      throw new Error('Du hast keinen Zugriff auf diesen Kalender.');
    }

    const access = accessSnapshot.data() as Record<string, unknown>;
    const role = access.role === 'owner' ? 'owner' : access.role === 'member' ? 'member' : null;

    if (!role) {
      throw new Error('Du hast keinen Zugriff auf diesen Kalender.');
    }

    if (!slotSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
    }

    const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (calendar.ownerUid === params.bookedByUid) {
      throw new Error('Eigene Slots koennen nicht ueber diese Ansicht gebucht werden.');
    }

    if (!slot.startsAt || !slot.endsAt) {
      throw new Error('Fuer diesen Slot fehlen gueltige Zeitangaben.');
    }

    if (slot.status !== 'available' || slot.appointmentId) {
      throw new Error('Dieser Slot ist nicht mehr verfuegbar.');
    }

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      ownerUid: calendar.ownerUid,
      participantUid: params.bookedByUid,
      bookedByUserId: params.bookedByUid,
      participantName: null,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey: normalizeEmail(trimmedEmail),
      participantEmail: trimmedEmail,
      participantEmailKey: normalizeEmail(trimmedEmail),
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
      actorRole: 'member',
      targetEmail: trimmedEmail,
      targetUid: params.bookedByUid,
      statusAfter: 'booked',
      note: null,
      createdAt: serverTimestamp(),
    });

    return {
      appointmentId: appointmentRef.id,
      ownerUid: calendar.ownerUid,
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
    };
  }).then(async (result) => {
    const ownerProfile = await getOwnerProfile(result.ownerUid);
    await Promise.all([
      createNotification({
        calendarId: params.calendarId,
        recipientUid: result.ownerUid,
        recipientEmail: result.ownerEmail,
        type: 'booking_created',
        channel: 'in_app',
        appointmentId: result.appointmentId,
        slotId: params.slotId,
        title: buildNotificationContent({
          type: 'booking_created',
          ownerEmail: ownerProfile?.email ?? result.ownerEmail,
          startsAt: result.startsAt,
        }).title,
        body: buildNotificationContent({
          type: 'booking_created',
          ownerEmail: ownerProfile?.email ?? result.ownerEmail,
          startsAt: result.startsAt,
        }).body,
      }),
      createNotification({
        calendarId: params.calendarId,
        recipientUid: result.ownerUid,
        recipientEmail: result.ownerEmail,
        type: 'booking_created',
        channel: 'email',
        appointmentId: result.appointmentId,
        slotId: params.slotId,
      }),
    ]);

    return result.appointmentId;
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
    throw new Error('Bitte akzeptiere vor der Buchung die AGB und die Datenschutzerklaerung.');
  }

  const slotRef = calendarSlotDoc(params.calendarId, params.slotId);
  const appointmentRef = doc(calendarAppointmentsCollection(params.calendarId));
  const eventRef = doc(slotEventsCollection(params.calendarId, params.slotId));

  return runTransaction(db, async (transaction) => {
    const [calendarSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(calendarDoc(params.calendarId)),
      transaction.get(slotRef),
    ]);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Kalender existiert nicht mehr.');
    }

    if (!slotSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Slot existiert nicht mehr.');
    }

    const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
    const slot = mapSlot(slotSnapshot.id, slotSnapshot.data() as Record<string, unknown>);

    if (calendar.visibility !== 'public') {
      throw new Error('Dieser Kalender kann nicht oeffentlich gebucht werden.');
    }

    if (!slot.startsAt || !slot.endsAt) {
      throw new Error('Fuer diesen Slot fehlen gueltige Zeitangaben.');
    }

    if (slot.status !== 'available' || slot.appointmentId) {
      throw new Error('Dieser Slot ist nicht mehr verfuegbar.');
    }

    transaction.set(appointmentRef, {
      calendarId: params.calendarId,
      slotId: params.slotId,
      ownerUid: calendar.ownerUid,
      participantUid: null,
      bookedByUserId: null,
      participantName: trimmedName,
      bookedByEmail: trimmedEmail,
      bookedByEmailKey: normalizeEmail(trimmedEmail),
      participantEmail: trimmedEmail,
      participantEmailKey: normalizeEmail(trimmedEmail),
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
      actorRole: 'guest',
      targetEmail: trimmedEmail,
      targetUid: null,
      statusAfter: 'booked',
      note: trimmedName,
      createdAt: serverTimestamp(),
    });

    return {
      appointmentId: appointmentRef.id,
      ownerUid: calendar.ownerUid,
      ownerEmail: calendar.ownerEmail,
      startsAt: slot.startsAt,
      participantEmail: trimmedEmail,
    };
  }).then(async (result) => {
    const ownerContent = buildNotificationContent({
      type: 'booking_created',
      ownerEmail: result.ownerEmail,
      startsAt: result.startsAt,
    });
    const guestContent = buildNotificationContent({
      type: 'booking_confirmation',
      ownerEmail: result.ownerEmail,
      startsAt: result.startsAt,
    });

    const notifications = [
      createNotification({
        calendarId: params.calendarId,
        recipientUid: result.ownerUid,
        recipientEmail: result.ownerEmail,
        type: 'booking_created',
        channel: 'in_app',
        appointmentId: result.appointmentId,
        slotId: params.slotId,
        title: ownerContent.title,
        body: ownerContent.body,
      }),
      createNotification({
        calendarId: params.calendarId,
        recipientUid: result.ownerUid,
        recipientEmail: result.ownerEmail,
        type: 'booking_created',
        channel: 'email',
        appointmentId: result.appointmentId,
        slotId: params.slotId,
        title: ownerContent.title,
        body: ownerContent.body,
      }),
      createNotification({
        calendarId: params.calendarId,
        recipientEmail: result.participantEmail,
        type: 'booking_confirmation',
        channel: 'email',
        appointmentId: result.appointmentId,
        slotId: params.slotId,
        title: guestContent.title,
        body: guestContent.body,
      }),
    ];

    if (params.requestAccountCreation) {
      notifications.push(
        createNotification({
          calendarId: params.calendarId,
          recipientEmail: result.participantEmail,
          type: 'account_creation_invite',
          channel: 'email',
          appointmentId: result.appointmentId,
          slotId: params.slotId,
        })
      );
    }

    await Promise.all(notifications);
    return result.appointmentId;
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
  const trimmedCancellationMessage = params.cancellationMessage?.trim() ?? '';

  const result = await runTransaction(db, async (transaction) => {
    const [calendarSnapshot, appointmentSnapshot] = await Promise.all([
      transaction.get(calendarDoc(params.calendarId)),
      transaction.get(appointmentRef),
    ]);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der zugehoerige Kalender existiert nicht mehr.');
    }

    if (!appointmentSnapshot.exists()) {
      throw new Error('Der Termin existiert nicht mehr.');
    }

    const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
    const appointment = mapAppointment(appointmentSnapshot.id, appointmentSnapshot.data() as Record<string, unknown>);

    if (appointment.status === 'cancelled') {
      throw new Error('Der Termin wurde bereits storniert.');
    }

    const slotRef = appointment.slotId ? calendarSlotDoc(params.calendarId, appointment.slotId) : null;

    if (slotRef) {
      const slotSnapshot = await transaction.get(slotRef);

      if (!slotSnapshot.exists()) {
        throw new Error('Der zugehoerige Slot existiert nicht mehr.');
      }

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
        targetUid: appointment.participantUid,
        statusAfter: params.nextSlotStatus,
        note: trimmedCancellationMessage || null,
        createdAt: serverTimestamp(),
      });
    }

    transaction.update(appointmentRef, {
      status: 'cancelled',
      cancelledByUserId: params.ownerId,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      calendar,
      appointment,
    };
  });

  const content = buildNotificationContent({
    type: 'slot_cancelled',
    ownerEmail: result.calendar.ownerEmail,
    startsAt: result.appointment.startsAt,
  });
  const body = trimmedCancellationMessage ? `${content.body}\n\n${trimmedCancellationMessage}` : content.body;

  await Promise.all([
    createNotification({
      calendarId: params.calendarId,
      recipientUid: result.appointment.participantUid,
      recipientEmail: result.appointment.participantEmail,
      type: 'slot_cancelled',
      channel: 'in_app',
      appointmentId: params.appointmentId,
      slotId: result.appointment.slotId ?? null,
      title: content.title,
      body,
    }),
    createNotification({
      calendarId: params.calendarId,
      recipientUid: result.appointment.participantUid,
      recipientEmail: result.appointment.participantEmail,
      type: 'slot_cancelled',
      channel: 'email',
      appointmentId: params.appointmentId,
      slotId: result.appointment.slotId ?? null,
      title: content.title,
      body,
    }),
  ]);
}

export async function createNotificationRecord(params: {
  calendarId: string;
  recipientEmail: string;
  recipientUid?: string | null;
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
    throw new Error('Fuer die Benachrichtigung ist eine E-Mail-Adresse erforderlich.');
  }

  await createNotification({
    calendarId: params.calendarId,
    recipientUid: params.recipientUid ?? null,
    recipientEmail: trimmedEmail,
    type: params.type,
    channel: params.channel,
    appointmentId: params.appointmentId ?? null,
    slotId: params.slotId ?? null,
    title: params.title,
    body: params.body,
    dedupeKey: params.dedupeKey ?? null,
  });
}

export async function upsertOwnerDeviceToken(params: {
  ownerUid: string;
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web';
}) {
  await setDoc(
    doc(userDevicesCollection(params.ownerUid), params.expoPushToken),
    {
      ownerUid: params.ownerUid,
      expoPushToken: params.expoPushToken,
      platform: params.platform,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
