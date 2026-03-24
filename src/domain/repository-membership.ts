import {
  collectionGroup,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';

import type {
  CalendarAccessRecord,
  CalendarAccessRequestRecord,
  CalendarInviteRecord,
} from './types';
import {
  calendarAccessCollection,
  calendarAccessDoc,
  calendarAccessRequestDoc,
  calendarAccessRequestsCollection,
  calendarInvitesCollection,
  calendarInviteDoc,
  mapAccess,
  mapAccessRequest,
  mapInvite,
  userConnectedCalendarPreferenceDoc,
} from './repository-shared';
import {
  getCalendarBySlug,
  getOwnerProfile,
  getUserProfileByEmail,
  getUserProfileByUsername,
} from './repository-core';

function extractUsernameFromIdentifier(identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return '';
  }

  if (!trimmedIdentifier.includes('://')) {
    return trimmedIdentifier.replace(/^\/+|\/+$/g, '').replace(/^user\//, '');
  }

  try {
    const parsedUrl = new URL(trimmedIdentifier);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);

    if (!segments.length) {
      return '';
    }

    if (segments[0] === 'user' && segments[1]) {
      return segments[1];
    }

    return segments[segments.length - 1] ?? '';
  } catch {
    return '';
  }
}

async function resolveInviteTarget(identifier: string) {
  const extractedUsername = extractUsernameFromIdentifier(identifier);

  if (extractedUsername) {
    const byUsername = await getUserProfileByUsername(extractedUsername);
    if (byUsername) {
      return byUsername;
    }
  }

  if (identifier.includes('@')) {
    const byEmail = await getUserProfileByEmail(identifier);
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

async function getMembership(calendarId: string, uid: string) {
  const snapshot = await getDoc(calendarAccessDoc(calendarId, uid));
  return snapshot.exists() ? mapAccess(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

async function ensureNoPendingInviteOrRequest(calendarId: string, uid: string) {
  const [inviteSnapshot, requestSnapshot] = await Promise.all([
    getDoc(calendarInviteDoc(calendarId, uid)),
    getDoc(calendarAccessRequestDoc(calendarId, uid)),
  ]);

  if (inviteSnapshot.exists()) {
    const invite = mapInvite(inviteSnapshot.id, inviteSnapshot.data() as Record<string, unknown>);
    if (invite.status === 'pending') {
      throw new Error('Fuer diese Person ist bereits eine Einladung offen.');
    }
  }

  if (requestSnapshot.exists()) {
    const request = mapAccessRequest(requestSnapshot.id, requestSnapshot.data() as Record<string, unknown>);
    if (request.status === 'pending') {
      throw new Error('Fuer diese Person liegt bereits eine offene Zugriffsanfrage vor.');
    }
  }
}

export async function createCalendarInvite(params: {
  calendarId: string;
  ownerUid: string;
  inviteeIdentifier: string;
}) {
  const targetUser = await resolveInviteTarget(params.inviteeIdentifier);

  if (!targetUser || !targetUser.username) {
    throw new Error('Zu dieser Nutzerkennung wurde kein Slotly-Nutzer gefunden.');
  }

  if (targetUser.uid === params.ownerUid) {
    throw new Error('Du kannst dich nicht selbst einladen.');
  }

  const existingMembership = await getMembership(params.calendarId, targetUser.uid);

  if (existingMembership) {
    throw new Error('Diese Person ist bereits Mitglied dieses Kalenders.');
  }

  await ensureNoPendingInviteOrRequest(params.calendarId, targetUser.uid);

  await setDoc(
    calendarInviteDoc(params.calendarId, targetUser.uid),
    {
      calendarId: params.calendarId,
      invitedUid: targetUser.uid,
      invitedEmail: targetUser.email,
      invitedUsername: targetUser.username,
      invitedByUid: params.ownerUid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      respondedAt: null,
    },
    { merge: true }
  );
}

export async function leaveCalendarAsMember(params: { calendarId: string; memberUid: string }) {
  const membership = await getMembership(params.calendarId, params.memberUid);

  if (!membership) {
    throw new Error('Die Mitgliedschaft existiert nicht mehr.');
  }

  if (membership.role === 'owner') {
    throw new Error('Der Inhaber kann den eigenen Kalender nicht verlassen.');
  }

  await deleteDoc(calendarAccessDoc(params.calendarId, params.memberUid));
}

export async function removeCalendarAccess(params: {
  calendarId: string;
  memberUid?: string | null;
  granteeEmail?: string | null;
}) {
  let memberUid = params.memberUid ?? null;

  if (!memberUid && params.granteeEmail) {
    const member = await getUserProfileByEmail(params.granteeEmail);
    memberUid = member?.uid ?? null;
  }

  if (!memberUid) {
    throw new Error('Das Mitglied konnte nicht aufgeloest werden.');
  }

  const membership = await getMembership(params.calendarId, memberUid);

  if (!membership) {
    throw new Error('Die Mitgliedschaft existiert nicht mehr.');
  }

  if (membership.role === 'owner') {
    throw new Error('Der Inhaber kann nicht aus dem eigenen Kalender entfernt werden.');
  }

  await deleteDoc(calendarAccessDoc(params.calendarId, memberUid));
}

export async function removeConnectedCalendar(params: {
  ownerUid: string;
  calendarId: string;
  granteeEmail: string;
}) {
  const member = await getUserProfileByEmail(params.granteeEmail);

  if (!member) {
    throw new Error('Der zu entfernende Nutzer konnte nicht gefunden werden.');
  }

  await leaveCalendarAsMember({ calendarId: params.calendarId, memberUid: member.uid });
  await deleteDoc(userConnectedCalendarPreferenceDoc(params.ownerUid, params.calendarId));
}

export async function upsertCalendarAccessRequest(params: {
  calendarId: string;
  calendarSlug?: string | null;
  requesterUid?: string | null;
  requesterEmail: string;
  requesterUsername?: string | null;
  status?: CalendarAccessRequestRecord['status'];
}) {
  const requesterUid = params.requesterUid?.trim();

  if (!requesterUid) {
    throw new Error('Fuer die Anfrage ist eine Nutzer-ID erforderlich.');
  }

  await setDoc(
    calendarAccessRequestDoc(params.calendarId, requesterUid),
    {
      calendarId: params.calendarId,
      uid: requesterUid,
      requesterUid,
      requesterEmail: params.requesterEmail.trim(),
      requesterUsername: params.requesterUsername ?? null,
      calendarSlug: params.calendarSlug ?? null,
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
  return onSnapshot(
    query(calendarAccessCollection(calendarId)),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((documentSnapshot) =>
            mapAccess(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
          )
          .sort((left, right) => left.email.localeCompare(right.email))
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
  return onSnapshot(
    query(calendarAccessRequestsCollection(calendarId)),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((documentSnapshot) =>
            mapAccessRequest(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
          )
          .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0))
      );
    },
    onError
  );
}

export function subscribeToPendingCalendarAccessRequestsByRequester(
  requesterUid: string,
  onData: (records: CalendarAccessRequestRecord[]) => void,
  onError: (error: Error) => void
) {
  const requestsQuery = query(
    collectionGroup(db, 'accessRequests'),
    where('requesterUid', '==', requesterUid),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      onData(
        snapshot.docs
          .map((documentSnapshot) =>
            mapAccessRequest(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
          )
          .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0))
      );
    },
    onError
  );
}

export function subscribeToPendingCalendarInvitesByUser(
  invitedUid: string,
  onData: (records: CalendarInviteRecord[]) => void,
  onError: (error: Error) => void
) {
  const invitesQuery = query(
    collectionGroup(db, 'invites'),
    where('invitedUid', '==', invitedUid),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    invitesQuery,
    (snapshot) => {
      onData(
        snapshot.docs
          .map((documentSnapshot) =>
            mapInvite(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
          )
          .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0))
      );
    },
    onError
  );
}

export function subscribeToCalendarInvites(
  calendarId: string,
  onData: (records: CalendarInviteRecord[]) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    query(calendarInvitesCollection(calendarId)),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((documentSnapshot) =>
            mapInvite(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
          )
          .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0))
      );
    },
    onError
  );
}

export async function requestCalendarAccessBySlug(params: {
  slug: string;
  requesterUid: string;
  requesterEmail: string;
}) {
  const calendar = await getCalendarBySlug(params.slug);

  if (!calendar) {
    throw new Error('Zu diesem Kalender-Link wurde kein Kalender gefunden.');
  }

  if (calendar.ownerUid === params.requesterUid) {
    throw new Error('Fuer den eigenen Kalender musst du keine Anfrage stellen.');
  }

  if (calendar.visibility !== 'private') {
    throw new Error('Anfragen sind aktuell nur fuer private Kalender verfuegbar.');
  }

  const requesterProfile = await getOwnerProfile(params.requesterUid);

  if (!requesterProfile) {
    throw new Error('Dein Konto konnte nicht aufgeloest werden.');
  }

  const existingMembership = await getMembership(calendar.id, params.requesterUid);

  if (existingMembership) {
    throw new Error('Du hast bereits Zugriff auf diesen Kalender.');
  }

  const pendingInvite = await getDoc(calendarInviteDoc(calendar.id, params.requesterUid));

  if (pendingInvite.exists()) {
    const invite = mapInvite(pendingInvite.id, pendingInvite.data() as Record<string, unknown>);
    if (invite.status === 'pending') {
      throw new Error('Fuer dich liegt bereits eine offene Einladung zu diesem Kalender vor.');
    }
  }

  const requestSnapshot = await getDoc(calendarAccessRequestDoc(calendar.id, params.requesterUid));

  if (requestSnapshot.exists()) {
    const request = mapAccessRequest(requestSnapshot.id, requestSnapshot.data() as Record<string, unknown>);
    if (request.status === 'pending') {
      throw new Error('Du hast bereits eine Anfrage zu diesem Kalender gesendet.');
    }
  }

  await upsertCalendarAccessRequest({
    calendarId: calendar.id,
    calendarSlug: calendar.calendarSlug,
    requesterUid: params.requesterUid,
    requesterEmail: params.requesterEmail,
    requesterUsername: requesterProfile.username,
    status: 'pending',
  });

  return calendar;
}

export async function approveCalendarAccessRequest(params: {
  calendarId: string;
  ownerId: string;
  requesterUid?: string;
  requesterEmail?: string;
}) {
  let requesterUid = params.requesterUid ?? null;

  if (!requesterUid && params.requesterEmail) {
    const requester = await getUserProfileByEmail(params.requesterEmail);
    requesterUid = requester?.uid ?? null;
  }

  if (!requesterUid) {
    throw new Error('Die ausgewaehlte Anfrage konnte nicht aufgeloest werden.');
  }

  const [ownerMembership, requestSnapshot, requesterProfile] = await Promise.all([
    getMembership(params.calendarId, params.ownerId),
    getDoc(calendarAccessRequestDoc(params.calendarId, requesterUid)),
    getOwnerProfile(requesterUid),
  ]);

  if (!ownerMembership || ownerMembership.role !== 'owner') {
    throw new Error('Nur der Kalenderinhaber kann Zugriffsanfragen bearbeiten.');
  }

  if (!requestSnapshot.exists()) {
    throw new Error('Die ausgewaehlte Anfrage existiert nicht mehr.');
  }

  if (!requesterProfile) {
    throw new Error('Der anfragende Nutzer konnte nicht gefunden werden.');
  }

  await runTransaction(db, async (transaction) => {
    const freshRequestSnapshot = await transaction.get(calendarAccessRequestDoc(params.calendarId, requesterUid!));

    if (!freshRequestSnapshot.exists()) {
      throw new Error('Die ausgewaehlte Anfrage existiert nicht mehr.');
    }

    transaction.set(
      calendarAccessDoc(params.calendarId, requesterUid!),
      {
        calendarId: params.calendarId,
        uid: requesterUid,
        role: 'member',
        email: requesterProfile.email,
        username: requesterProfile.username,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      freshRequestSnapshot.ref,
      {
        status: 'approved',
        updatedAt: serverTimestamp(),
        respondedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function rejectCalendarAccessRequest(params: {
  calendarId: string;
  ownerId?: string;
  requesterUid?: string;
  requesterEmail?: string;
}) {
  let requesterUid = params.requesterUid ?? null;

  if (!requesterUid && params.requesterEmail) {
    const requester = await getUserProfileByEmail(params.requesterEmail);
    requesterUid = requester?.uid ?? null;
  }

  if (!requesterUid) {
    throw new Error('Die ausgewaehlte Anfrage konnte nicht aufgeloest werden.');
  }

  if (params.ownerId) {
    const ownerMembership = await getMembership(params.calendarId, params.ownerId);

    if (!ownerMembership || ownerMembership.role !== 'owner') {
      throw new Error('Nur der Kalenderinhaber kann Zugriffsanfragen bearbeiten.');
    }
  }

  await setDoc(
    calendarAccessRequestDoc(params.calendarId, requesterUid),
    {
      status: 'rejected',
      updatedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function cancelCalendarAccessRequest(params: {
  calendarId: string;
  requesterUid?: string;
  requesterEmail?: string;
}) {
  let requesterUid = params.requesterUid ?? null;

  if (!requesterUid && params.requesterEmail) {
    const requester = await getUserProfileByEmail(params.requesterEmail);
    requesterUid = requester?.uid ?? null;
  }

  if (!requesterUid) {
    throw new Error('Die ausgewaehlte Anfrage konnte nicht aufgeloest werden.');
  }

  await setDoc(
    calendarAccessRequestDoc(params.calendarId, requesterUid),
    {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function acceptCalendarInvite(params: { calendarId: string; invitedUid: string }) {
  const [inviteSnapshot, userProfile] = await Promise.all([
    getDoc(calendarInviteDoc(params.calendarId, params.invitedUid)),
    getOwnerProfile(params.invitedUid),
  ]);

  if (!inviteSnapshot.exists()) {
    throw new Error('Die Einladung existiert nicht mehr.');
  }

  if (!userProfile) {
    throw new Error('Der eingeladene Nutzer konnte nicht gefunden werden.');
  }

  await runTransaction(db, async (transaction) => {
    const freshInviteSnapshot = await transaction.get(calendarInviteDoc(params.calendarId, params.invitedUid));

    if (!freshInviteSnapshot.exists()) {
      throw new Error('Die Einladung existiert nicht mehr.');
    }

    transaction.set(
      calendarAccessDoc(params.calendarId, params.invitedUid),
      {
        calendarId: params.calendarId,
        uid: params.invitedUid,
        role: 'member',
        email: userProfile.email,
        username: userProfile.username,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      freshInviteSnapshot.ref,
      {
        status: 'accepted',
        updatedAt: serverTimestamp(),
        respondedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function rejectCalendarInvite(params: { calendarId: string; invitedUid: string }) {
  await setDoc(
    calendarInviteDoc(params.calendarId, params.invitedUid),
    {
      status: 'rejected',
      updatedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
