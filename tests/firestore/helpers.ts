import {
  assertFails,
  assertSucceeds,
  type RulesTestContext,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { expect } from 'vitest';

import { findOverlappingSlots } from '../../src/domain/calendar-utils';
import type { CalendarSlotRecord } from '../../src/domain/types';

export const ownerUser = {
  uid: 'user_owner_1',
  username: 'owneruser',
  email: 'owner@example.com',
};

export const memberUser = {
  uid: 'user_member_1',
  username: 'memberuser',
  email: 'member@example.com',
};

export const ownerCalendarId = ownerUser.uid;
export const ownerCalendarSlug = ownerUser.username;

export function emailKey(email: string) {
  return email.trim().toLowerCase();
}

export function firestoreOf(context: RulesTestContext) {
  return context.firestore();
}

export async function bootstrapRegisteredUser(context: RulesTestContext, user: {
  uid: string;
  username: string;
  email: string;
}) {
  const db = firestoreOf(context);
  const key = emailKey(user.email);

  await assertSucceeds(
    setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      emailKey: key,
      username: user.username,
      defaultCalendarId: user.uid,
      subscriptionTier: 'free',
      isActive: true,
      createdAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
    })
  );

  await assertSucceeds(
    setDoc(doc(db, 'usernames', user.username), {
      username: user.username,
      uid: user.uid,
      createdAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
    })
  );

  await assertSucceeds(
    setDoc(doc(db, 'emails', key), {
      email: user.email,
      emailKey: key,
      uid: user.uid,
      createdAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
    })
  );
}

export async function bootstrapOwnerCalendar(context: RulesTestContext) {
  const db = firestoreOf(context);

  await bootstrapRegisteredUser(context, ownerUser);

  await assertSucceeds(
    setDoc(doc(db, 'calendars', ownerCalendarId), {
      calendarId: ownerCalendarId,
      ownerUid: ownerUser.uid,
      ownerEmail: ownerUser.email,
      ownerUsername: ownerUser.username,
      title: 'Owner Calendar',
      visibility: 'private',
      calendarSlug: ownerCalendarSlug,
      description: null,
      notifyOnNewSlotsAvailable: false,
      isArchived: false,
      createdAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
    })
  );

  await assertSucceeds(
    setDoc(doc(db, 'calendars', ownerCalendarId, 'access', ownerUser.uid), {
      calendarId: ownerCalendarId,
      uid: ownerUser.uid,
      role: 'owner',
      email: ownerUser.email,
      username: ownerUser.username,
      addedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
    })
  );

  await assertSucceeds(
    setDoc(doc(db, 'calendarSlugs', ownerCalendarSlug), {
      calendarSlug: ownerCalendarSlug,
      calendarId: ownerCalendarId,
      createdAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:00:00.000Z')),
    })
  );
}

export async function bootstrapMemberUser(context: RulesTestContext) {
  await bootstrapRegisteredUser(context, memberUser);
}

async function listCalendarSlots(context: RulesTestContext, calendarId: string) {
  const db = firestoreOf(context);
  const snapshot = await getDocs(query(collection(db, 'calendars', calendarId, 'slots'), orderBy('startsAt', 'asc')));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      id: documentSnapshot.id,
      calendarId: String(data.calendarId ?? ''),
      ownerUid: String(data.ownerUid ?? ''),
      ownerId: String(data.ownerUid ?? ''),
      startsAt: data.startsAt instanceof Timestamp ? data.startsAt.toDate() : null,
      endsAt: data.endsAt instanceof Timestamp ? data.endsAt.toDate() : null,
      status: data.status === 'booked' ? 'booked' : data.status === 'inactive' ? 'inactive' : 'available',
      appointmentId: typeof data.appointmentId === 'string' ? data.appointmentId : null,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
    } satisfies CalendarSlotRecord;
  });
}

export async function createOwnerSlot(params: {
  context: RulesTestContext;
  calendarId: string;
  slotId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const db = firestoreOf(params.context);
  const existingSlots = await listCalendarSlots(params.context, params.calendarId);
  const overlaps = findOverlappingSlots(existingSlots, [
    { startsAt: params.startsAt, endsAt: params.endsAt },
  ]);

  if (overlaps.length) {
    throw new Error('OVERLAPPING_SLOT_BLOCKED');
  }

  await assertSucceeds(
    setDoc(doc(db, 'calendars', params.calendarId, 'slots', params.slotId), {
      calendarId: params.calendarId,
      ownerUid: ownerUser.uid,
      startsAt: Timestamp.fromDate(params.startsAt),
      endsAt: Timestamp.fromDate(params.endsAt),
      status: 'available',
      appointmentId: null,
      createdAt: Timestamp.fromDate(new Date('2026-03-23T10:30:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:30:00.000Z')),
    })
  );
}

export async function createMemberAccessByOwner(context: RulesTestContext) {
  const db = firestoreOf(context);

  await assertSucceeds(
    setDoc(doc(db, 'calendars', ownerCalendarId, 'access', memberUser.uid), {
      calendarId: ownerCalendarId,
      uid: memberUser.uid,
      role: 'member',
      email: memberUser.email,
      username: memberUser.username,
      addedAt: Timestamp.fromDate(new Date('2026-03-23T10:40:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:40:00.000Z')),
    })
  );
}

export async function bookSlotAsMember(params: {
  context: RulesTestContext;
  calendarId: string;
  slotId: string;
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const db = firestoreOf(params.context);
  const batch = writeBatch(db);

  batch.set(doc(db, 'calendars', params.calendarId, 'appointments', params.appointmentId), {
    calendarId: params.calendarId,
    slotId: params.slotId,
    ownerUid: ownerUser.uid,
    participantUid: memberUser.uid,
    bookedByUserId: memberUser.uid,
    participantName: 'Member User',
    bookedByEmail: memberUser.email,
    bookedByEmailKey: emailKey(memberUser.email),
    participantEmail: memberUser.email,
    participantEmailKey: emailKey(memberUser.email),
    guestBooking: false,
    accountCreationRequested: false,
    startsAt: Timestamp.fromDate(params.startsAt),
    endsAt: Timestamp.fromDate(params.endsAt),
    source: 'self_service',
    status: 'booked',
    createdByUserId: memberUser.uid,
    createdAt: Timestamp.fromDate(new Date('2026-03-23T11:00:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-03-23T11:00:00.000Z')),
  });

  batch.update(doc(db, 'calendars', params.calendarId, 'slots', params.slotId), {
    status: 'booked',
    appointmentId: params.appointmentId,
    updatedAt: Timestamp.fromDate(new Date('2026-03-23T11:00:00.000Z')),
  });

  batch.set(doc(db, 'calendars', params.calendarId, 'slots', params.slotId, 'events', `event-${params.appointmentId}`), {
    calendarId: params.calendarId,
    slotId: params.slotId,
    type: 'booked',
    actorUid: memberUser.uid,
    actorRole: 'member',
    targetEmail: memberUser.email,
    targetUid: memberUser.uid,
    statusAfter: 'booked',
    note: null,
    createdAt: Timestamp.fromDate(new Date('2026-03-23T11:00:00.000Z')),
  });

  await assertSucceeds(batch.commit());
}

export async function expectDocExists(context: RulesTestContext, path: string[]) {
  const db = firestoreOf(context);
  const [collectionPath, documentPath, ...rest] = path;
  const snapshot = await assertSucceeds(getDoc(doc(db, collectionPath, documentPath, ...rest)));
  expect(snapshot.exists()).toBe(true);
  return snapshot;
}

export async function expectDocMissing(context: RulesTestContext, path: string[]) {
  const db = firestoreOf(context);
  const [collectionPath, documentPath, ...rest] = path;
  const snapshot = await assertSucceeds(getDoc(doc(db, collectionPath, documentPath, ...rest)));
  expect(snapshot.exists()).toBe(false);
}

export async function expectWriteDenied(operation: Promise<unknown>) {
  await assertFails(operation);
}

export async function approveAccessRequest(ownerContext: RulesTestContext) {
  const db = firestoreOf(ownerContext);
  const batch = writeBatch(db);

  batch.set(doc(db, 'calendars', ownerCalendarId, 'access', memberUser.uid), {
    calendarId: ownerCalendarId,
    uid: memberUser.uid,
    role: 'member',
    email: memberUser.email,
    username: memberUser.username,
    addedAt: Timestamp.fromDate(new Date('2026-03-23T10:50:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:50:00.000Z')),
  });

  batch.update(doc(db, 'calendars', ownerCalendarId, 'accessRequests', memberUser.uid), {
    status: 'approved',
    updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:50:00.000Z')),
  });

  await assertSucceeds(batch.commit());
}

export async function acceptInvite(memberContext: RulesTestContext) {
  const db = firestoreOf(memberContext);
  const batch = writeBatch(db);

  batch.set(doc(db, 'calendars', ownerCalendarId, 'access', memberUser.uid), {
    calendarId: ownerCalendarId,
    uid: memberUser.uid,
    role: 'member',
    email: memberUser.email,
    username: memberUser.username,
    addedAt: Timestamp.fromDate(new Date('2026-03-23T10:55:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:55:00.000Z')),
  });

  batch.update(doc(db, 'calendars', ownerCalendarId, 'invites', memberUser.uid), {
    status: 'accepted',
    respondedAt: Timestamp.fromDate(new Date('2026-03-23T10:55:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-03-23T10:55:00.000Z')),
  });

  await assertSucceeds(batch.commit());
}
