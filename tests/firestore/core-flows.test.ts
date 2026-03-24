import { assertSucceeds } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { describe, expect, test } from 'vitest';

import { getAuthenticatedContext } from './setup';
import {
  acceptInvite,
  approveAccessRequest,
  bookSlotAsMember,
  bootstrapMemberUser,
  bootstrapOwnerCalendar,
  createMemberAccessByOwner,
  createOwnerSlot,
  emailKey,
  expectDocExists,
  expectDocMissing,
  expectWriteDenied,
  firestoreOf,
  memberUser,
  ownerCalendarId,
  ownerCalendarSlug,
  ownerUser,
} from './helpers';

describe('Firestore core flows', () => {
  test('Registration bootstrap creates all canonical root documents', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });

    await bootstrapOwnerCalendar(ownerContext);

    await expectDocExists(ownerContext, ['users', ownerUser.uid]);
    await expectDocExists(ownerContext, ['usernames', ownerUser.username]);
    await expectDocExists(ownerContext, ['emails', emailKey(ownerUser.email)]);
    await expectDocExists(ownerContext, ['calendars', ownerCalendarId]);
    await expectDocExists(ownerContext, ['calendarSlugs', ownerCalendarSlug]);
    await expectDocExists(ownerContext, ['calendars', ownerCalendarId, 'access', ownerUser.uid]);
  });

  test('Appointment calendar settings can be stored only on the own user settings path', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const ownerDb = firestoreOf(ownerContext);
    const memberDb = firestoreOf(memberContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);

    await assertSucceeds(
      setDoc(doc(ownerDb, 'users', ownerUser.uid, 'settings', 'appointmentCalendar'), {
        hiddenCalendarIds: ['calendar_a'],
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:05:00.000Z')),
      })
    );

    await expectDocExists(ownerContext, ['users', ownerUser.uid, 'settings', 'appointmentCalendar']);

    await expectWriteDenied(
      setDoc(doc(memberDb, 'users', ownerUser.uid, 'settings', 'appointmentCalendar'), {
        hiddenCalendarIds: ['calendar_b'],
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:06:00.000Z')),
      })
    );
  });

  test('Owner creates slot in own calendar', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });

    await bootstrapOwnerCalendar(ownerContext);
    await createOwnerSlot({
      context: ownerContext,
      calendarId: ownerCalendarId,
      slotId: 'slot_1',
      startsAt: new Date('2026-03-24T09:00:00.000Z'),
      endsAt: new Date('2026-03-24T10:00:00.000Z'),
    });

    const slotSnapshot = await expectDocExists(ownerContext, ['calendars', ownerCalendarId, 'slots', 'slot_1']);
    expect(slotSnapshot.data()?.calendarId).toBe(ownerCalendarId);
    expect(slotSnapshot.data()?.ownerUid).toBe(ownerUser.uid);
  });

  test('Slot overlap is blocked by the canonical overlap guard', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });

    await bootstrapOwnerCalendar(ownerContext);
    await createOwnerSlot({
      context: ownerContext,
      calendarId: ownerCalendarId,
      slotId: 'slot_1',
      startsAt: new Date('2026-03-24T09:00:00.000Z'),
      endsAt: new Date('2026-03-24T10:00:00.000Z'),
    });

    await expect(
      createOwnerSlot({
        context: ownerContext,
        calendarId: ownerCalendarId,
        slotId: 'slot_overlap',
        startsAt: new Date('2026-03-24T09:30:00.000Z'),
        endsAt: new Date('2026-03-24T10:30:00.000Z'),
      })
    ).rejects.toThrow('OVERLAPPING_SLOT_BLOCKED');

    await expectDocMissing(ownerContext, ['calendars', ownerCalendarId, 'slots', 'slot_overlap']);
  });

  test('Access request flow creates local request and owner approval creates membership', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const memberDb = firestoreOf(memberContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);

    await assertSucceeds(
      setDoc(doc(memberDb, 'calendars', ownerCalendarId, 'accessRequests', memberUser.uid), {
        calendarId: ownerCalendarId,
        uid: memberUser.uid,
        requesterUid: memberUser.uid,
        requesterEmail: memberUser.email,
        requesterUsername: memberUser.username,
        calendarSlug: ownerCalendarSlug,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date('2026-03-24T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:00:00.000Z')),
      })
    );

    await expectDocExists(memberContext, ['calendars', ownerCalendarId, 'accessRequests', memberUser.uid]);

    await approveAccessRequest(ownerContext);

    const accessSnapshot = await expectDocExists(ownerContext, ['calendars', ownerCalendarId, 'access', memberUser.uid]);
    expect(accessSnapshot.data()?.role).toBe('member');
  });

  test('Invite flow creates invite and member acceptance creates membership', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const ownerDb = firestoreOf(ownerContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);

    await assertSucceeds(
      setDoc(doc(ownerDb, 'calendars', ownerCalendarId, 'invites', memberUser.uid), {
        calendarId: ownerCalendarId,
        invitedUid: memberUser.uid,
        invitedEmail: memberUser.email,
        invitedUsername: memberUser.username,
        invitedByUid: ownerUser.uid,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date('2026-03-24T08:30:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:30:00.000Z')),
        respondedAt: null,
      })
    );

    await acceptInvite(memberContext);

    const accessSnapshot = await expectDocExists(memberContext, ['calendars', ownerCalendarId, 'access', memberUser.uid]);
    expect(accessSnapshot.data()?.role).toBe('member');
  });

  test('Owner rejection keeps access request out of membership and marks it as rejected', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const ownerDb = firestoreOf(ownerContext);
    const memberDb = firestoreOf(memberContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);

    await assertSucceeds(
      setDoc(doc(memberDb, 'calendars', ownerCalendarId, 'accessRequests', memberUser.uid), {
        calendarId: ownerCalendarId,
        uid: memberUser.uid,
        requesterUid: memberUser.uid,
        requesterEmail: memberUser.email,
        requesterUsername: memberUser.username,
        calendarSlug: ownerCalendarSlug,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date('2026-03-24T08:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:00:00.000Z')),
      })
    );

    await assertSucceeds(
      updateDoc(doc(ownerDb, 'calendars', ownerCalendarId, 'accessRequests', memberUser.uid), {
        status: 'rejected',
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:05:00.000Z')),
      })
    );

    await expectDocMissing(ownerContext, ['calendars', ownerCalendarId, 'access', memberUser.uid]);
    const requestSnapshot = await expectDocExists(ownerContext, [
      'calendars',
      ownerCalendarId,
      'accessRequests',
      memberUser.uid,
    ]);
    expect(requestSnapshot.data()?.status).toBe('rejected');
  });

  test('Member rejection keeps invite out of membership and marks it as rejected', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const ownerDb = firestoreOf(ownerContext);
    const memberDb = firestoreOf(memberContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);

    await assertSucceeds(
      setDoc(doc(ownerDb, 'calendars', ownerCalendarId, 'invites', memberUser.uid), {
        calendarId: ownerCalendarId,
        invitedUid: memberUser.uid,
        invitedEmail: memberUser.email,
        invitedUsername: memberUser.username,
        invitedByUid: ownerUser.uid,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date('2026-03-24T08:30:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:30:00.000Z')),
        respondedAt: null,
      })
    );

    await assertSucceeds(
      updateDoc(doc(memberDb, 'calendars', ownerCalendarId, 'invites', memberUser.uid), {
        status: 'rejected',
        respondedAt: Timestamp.fromDate(new Date('2026-03-24T08:35:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T08:35:00.000Z')),
      })
    );

    await expectDocMissing(ownerContext, ['calendars', ownerCalendarId, 'access', memberUser.uid]);
    const inviteSnapshot = await expectDocExists(ownerContext, [
      'calendars',
      ownerCalendarId,
      'invites',
      memberUser.uid,
    ]);
    expect(inviteSnapshot.data()?.status).toBe('rejected');
  });

  test('Member can leave own calendar membership but owner cannot leave own owner access', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const ownerDb = firestoreOf(ownerContext);
    const memberDb = firestoreOf(memberContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);
    await createMemberAccessByOwner(ownerContext);

    await assertSucceeds(deleteDoc(doc(memberDb, 'calendars', ownerCalendarId, 'access', memberUser.uid)));
    await expectDocMissing(ownerContext, ['calendars', ownerCalendarId, 'access', memberUser.uid]);

    await expectWriteDenied(deleteDoc(doc(ownerDb, 'calendars', ownerCalendarId, 'access', ownerUser.uid)));
    await expectDocExists(ownerContext, ['calendars', ownerCalendarId, 'access', ownerUser.uid]);
  });

  test('Owner can remove a member access entry', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const ownerDb = firestoreOf(ownerContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);
    await createMemberAccessByOwner(ownerContext);

    await assertSucceeds(deleteDoc(doc(ownerDb, 'calendars', ownerCalendarId, 'access', memberUser.uid)));
    await expectDocMissing(ownerContext, ['calendars', ownerCalendarId, 'access', memberUser.uid]);
  });

  test('Booking flow creates appointment and marks slot as booked', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);
    await createMemberAccessByOwner(ownerContext);
    await createOwnerSlot({
      context: ownerContext,
      calendarId: ownerCalendarId,
      slotId: 'slot_1',
      startsAt: new Date('2026-03-24T11:00:00.000Z'),
      endsAt: new Date('2026-03-24T12:00:00.000Z'),
    });

    await bookSlotAsMember({
      context: memberContext,
      calendarId: ownerCalendarId,
      slotId: 'slot_1',
      appointmentId: 'appointment_1',
      startsAt: new Date('2026-03-24T11:00:00.000Z'),
      endsAt: new Date('2026-03-24T12:00:00.000Z'),
    });

    const appointmentSnapshot = await expectDocExists(memberContext, ['calendars', ownerCalendarId, 'appointments', 'appointment_1']);
    const slotSnapshot = await expectDocExists(ownerContext, ['calendars', ownerCalendarId, 'slots', 'slot_1']);

    expect(appointmentSnapshot.data()?.participantUid).toBe(memberUser.uid);
    expect(slotSnapshot.data()?.status).toBe('booked');
    expect(slotSnapshot.data()?.appointmentId).toBe('appointment_1');
  });

  test('Double booking on the same slot is blocked by rules', async () => {
    const ownerContext = await getAuthenticatedContext({
      uid: ownerUser.uid,
      email: ownerUser.email,
    });
    const memberContext = await getAuthenticatedContext({
      uid: memberUser.uid,
      email: memberUser.email,
    });
    const memberDb = firestoreOf(memberContext);

    await bootstrapOwnerCalendar(ownerContext);
    await bootstrapMemberUser(memberContext);
    await createMemberAccessByOwner(ownerContext);
    await createOwnerSlot({
      context: ownerContext,
      calendarId: ownerCalendarId,
      slotId: 'slot_1',
      startsAt: new Date('2026-03-24T13:00:00.000Z'),
      endsAt: new Date('2026-03-24T14:00:00.000Z'),
    });

    await bookSlotAsMember({
      context: memberContext,
      calendarId: ownerCalendarId,
      slotId: 'slot_1',
      appointmentId: 'appointment_1',
      startsAt: new Date('2026-03-24T13:00:00.000Z'),
      endsAt: new Date('2026-03-24T14:00:00.000Z'),
    });

    const secondBookingBatch = writeBatch(memberDb);

    secondBookingBatch.set(doc(memberDb, 'calendars', ownerCalendarId, 'appointments', 'appointment_2'), {
        calendarId: ownerCalendarId,
        slotId: 'slot_1',
        ownerUid: ownerUser.uid,
        participantUid: memberUser.uid,
        bookedByUserId: memberUser.uid,
        bookedByEmail: memberUser.email,
        bookedByEmailKey: emailKey(memberUser.email),
        participantEmail: memberUser.email,
        participantEmailKey: emailKey(memberUser.email),
        guestBooking: false,
        accountCreationRequested: false,
        startsAt: Timestamp.fromDate(new Date('2026-03-24T13:00:00.000Z')),
        endsAt: Timestamp.fromDate(new Date('2026-03-24T14:00:00.000Z')),
        source: 'self_service',
        status: 'booked',
        createdByUserId: memberUser.uid,
        createdAt: Timestamp.fromDate(new Date('2026-03-24T13:10:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-03-24T13:10:00.000Z')),
      });
    secondBookingBatch.update(doc(memberDb, 'calendars', ownerCalendarId, 'slots', 'slot_1'), {
      status: 'booked',
      appointmentId: 'appointment_2',
      updatedAt: Timestamp.fromDate(new Date('2026-03-24T13:10:00.000Z')),
    });

    await expectWriteDenied(secondBookingBatch.commit());

    const secondAppointmentSnapshot = await assertSucceeds(
      getDoc(doc(firestoreOf(ownerContext), 'calendars', ownerCalendarId, 'appointments', 'appointment_2'))
    );
    expect(secondAppointmentSnapshot.exists()).toBe(false);

    const slotSnapshot = await assertSucceeds(getDoc(doc(memberDb, 'calendars', ownerCalendarId, 'slots', 'slot_1')));
    expect(slotSnapshot.data()?.appointmentId).toBe('appointment_1');
  });
});
