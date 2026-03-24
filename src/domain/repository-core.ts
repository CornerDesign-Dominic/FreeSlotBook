import {
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
  where,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';

import type {
  AppointmentCalendarSettings,
  CalendarRecord,
  DashboardData,
} from './types';
import {
  normalizeExistingUsername,
  resolveStableCalendarSlug,
} from './calendar-slug-policy';
import {
  appointmentCalendarSettingsDoc,
  calendarAccessCollection,
  calendarDoc,
  calendarSlugDoc,
  emailDoc,
  getDashboardLoadErrorMessage,
  mapAccess,
  mapAppointmentCalendarSettings,
  mapAppointment,
  mapCalendar,
  mapNotification,
  mapOwnerProfile,
  normalizeEmail,
  normalizeSlug,
  normalizeUsername,
  notificationCollection,
  reservedPublicSlugs,
  userConnectedCalendarPreferencesCollection,
  userDoc,
  usernameDoc,
} from './repository-shared';

const ownerSetupInFlight = new Map<string, Promise<{ calendarId: string }>>();

function validateSlotlymeUserId(username: string) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return '';
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    throw new Error('Die Slotlyme ID muss zwischen 3 und 30 Zeichen lang sein.');
  }

  if (!/^[a-z0-9-]+$/.test(normalizedUsername)) {
    throw new Error('Die Slotlyme ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  }

  if (reservedPublicSlugs.has(normalizedUsername)) {
    throw new Error('Diese Slotlyme ID ist reserviert und kann nicht verwendet werden.');
  }

  return normalizedUsername;
}

function validatePublicSlug(slug: string) {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return '';
  }

  if (normalizedSlug.length < 3 || normalizedSlug.length > 30) {
    throw new Error('Der Slug muss zwischen 3 und 30 Zeichen lang sein.');
  }

  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
    throw new Error('Der Kalender-Link darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
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
  if (!slotlymeId.trim()) {
    return '';
  }

  if (slotlymeId !== slotlymeId.trim()) {
    throw new Error('Die Slotlyme ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  }

  if (slotlymeId !== slotlymeId.toLowerCase()) {
    throw new Error('Die Slotlyme ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  }

  return validateSlotlymeUserId(slotlymeId);
}

export async function isSlotlymeUserIdAvailable(slotlymeId: string, currentUid?: string | null) {
  const normalizedUsername = validateSlotlymeUserId(slotlymeId);

  if (!normalizedUsername) {
    return false;
  }

  const snapshot = await getDoc(usernameDoc(normalizedUsername));

  if (!snapshot.exists()) {
    return true;
  }

  const claimedUid = typeof snapshot.data().uid === 'string' ? snapshot.data().uid : null;
  return claimedUid === currentUid;
}

export async function getOwnerProfile(uid: string) {
  const snapshot = await getDoc(userDoc(uid));
  return snapshot.exists() ? mapOwnerProfile(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

export async function getOwnerCalendar(calendarId: string) {
  const snapshot = await getDoc(calendarDoc(calendarId));
  return snapshot.exists() ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

export async function getUserProfileByUsername(username: string) {
  const normalizedUsername = validateSlotlymeUserId(username);

  if (!normalizedUsername) {
    return null;
  }

  const usernameSnapshot = await getDoc(usernameDoc(normalizedUsername));

  if (!usernameSnapshot.exists()) {
    return null;
  }

  const uid = typeof usernameSnapshot.data().uid === 'string' ? usernameSnapshot.data().uid : null;
  return uid ? getOwnerProfile(uid) : null;
}

export async function getUserProfileByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const emailSnapshot = await getDoc(emailDoc(normalizedEmail));

  if (!emailSnapshot.exists()) {
    return null;
  }

  const uid = typeof emailSnapshot.data().uid === 'string' ? emailSnapshot.data().uid : null;
  return uid ? getOwnerProfile(uid) : null;
}

export async function getCalendarBySlug(slug: string) {
  const normalizedSlug = validatePublicSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const slugSnapshot = await getDoc(calendarSlugDoc(normalizedSlug));

  if (!slugSnapshot.exists()) {
    return null;
  }

  const calendarId = typeof slugSnapshot.data().calendarId === 'string' ? slugSnapshot.data().calendarId : null;

  if (!calendarId) {
    return null;
  }

  const calendarSnapshot = await getDoc(calendarDoc(calendarId));

  if (!calendarSnapshot.exists()) {
    return null;
  }

  const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
  return calendar.calendarSlug === normalizedSlug ? calendar : null;
}

export async function getPublicCalendarIdBySlug(slug: string) {
  const calendar = await getCalendarBySlug(slug);
  return calendar?.visibility === 'public' ? calendar.id : null;
}

export async function isCalendarPublicSlugAvailable(slug: string, currentCalendarId?: string | null) {
  const normalizedSlug = validatePublicSlug(slug);

  if (!normalizedSlug) {
    return false;
  }

  const snapshot = await getDoc(calendarSlugDoc(normalizedSlug));

  if (!snapshot.exists()) {
    return true;
  }

  const claimedCalendarId = typeof snapshot.data().calendarId === 'string' ? snapshot.data().calendarId : null;
  return claimedCalendarId === currentCalendarId;
}

export async function ensureOwnerAccountSetup(params: {
  uid: string;
  email: string;
  slotlymeId?: string | null;
}) {
  const trimmedEmail = params.email.trim();

  if (!trimmedEmail) {
    throw new Error('Fuer die Einrichtung des Kontos ist eine E-Mail-Adresse erforderlich.');
  }

  const emailKey = normalizeEmail(trimmedEmail);
  const normalizedUsername = params.slotlymeId ? validateSlotlymeUserId(params.slotlymeId) : '';
  const calendarId = params.uid;
  const setupKey = `${params.uid}:${emailKey}:${normalizedUsername}`;
  const existingPromise = ownerSetupInFlight.get(setupKey);

  if (existingPromise) {
    return existingPromise;
  }

  const setupPromise = (async () => {
    await runTransaction(db, async (transaction) => {
      const [userSnapshot, calendarSnapshot, emailSnapshot] = await Promise.all([
        transaction.get(userDoc(params.uid)),
        transaction.get(calendarDoc(calendarId)),
        transaction.get(emailDoc(emailKey)),
      ]);

      let usernameSnapshot = null;

      if (normalizedUsername) {
        usernameSnapshot = await transaction.get(usernameDoc(normalizedUsername));
      }

      const claimedUsernameUid =
        usernameSnapshot && usernameSnapshot.exists() && typeof usernameSnapshot.data().uid === 'string'
          ? usernameSnapshot.data().uid
          : null;
      const claimedEmailUid =
        emailSnapshot.exists() && typeof emailSnapshot.data().uid === 'string' ? emailSnapshot.data().uid : null;

      if (claimedUsernameUid && claimedUsernameUid !== params.uid) {
        throw new Error('Diese Slotlyme ID ist bereits vergeben.');
      }

      if (claimedEmailUid && claimedEmailUid !== params.uid) {
        throw new Error('Fuer diese E-Mail-Adresse existiert bereits ein anderes Konto.');
      }

      const existingUsername = normalizeExistingUsername(
        userSnapshot.exists() ? userSnapshot.data().username : null
      );
      const nextUsername = normalizedUsername || existingUsername || null;
      const existingOwnerUsername =
        calendarSnapshot.exists() && typeof calendarSnapshot.data().ownerUsername === 'string'
          ? calendarSnapshot.data().ownerUsername
          : null;

      transaction.set(
        userDoc(params.uid),
        {
          uid: params.uid,
          email: trimmedEmail,
          emailKey,
          username: nextUsername,
          slotlymeId: nextUsername,
          subscriptionTier:
            userSnapshot.exists() && userSnapshot.data().subscriptionTier === 'pro' ? 'pro' : 'free',
          defaultCalendarId: calendarId,
          isActive: true,
          createdAt: userSnapshot.exists() ? userSnapshot.data().createdAt ?? serverTimestamp() : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (normalizedUsername && usernameSnapshot) {
        transaction.set(
          usernameDoc(normalizedUsername),
          {
            username: normalizedUsername,
            uid: params.uid,
            createdAt:
              usernameSnapshot.exists()
                ? usernameSnapshot.data().createdAt ?? serverTimestamp()
                : serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      transaction.set(
        emailDoc(emailKey),
        {
          email: trimmedEmail,
          emailKey,
          uid: params.uid,
          createdAt: emailSnapshot.exists() ? emailSnapshot.data().createdAt ?? serverTimestamp() : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        calendarDoc(calendarId),
        {
          calendarId,
          ownerUid: params.uid,
          ownerEmail: trimmedEmail,
          ownerUsername: nextUsername ?? existingOwnerUsername,
          title:
            calendarSnapshot.exists() && typeof calendarSnapshot.data().title === 'string'
              ? calendarSnapshot.data().title
              : 'Mein Kalender',
          visibility: calendarSnapshot.exists() ? calendarSnapshot.data().visibility ?? 'private' : 'private',
          calendarSlug:
            calendarSnapshot.exists() && typeof calendarSnapshot.data().calendarSlug === 'string'
              ? calendarSnapshot.data().calendarSlug
              : null,
          description:
            calendarSnapshot.exists() && typeof calendarSnapshot.data().description === 'string'
              ? calendarSnapshot.data().description
              : null,
          notifyOnNewSlotsAvailable:
            calendarSnapshot.exists() && calendarSnapshot.data().notifyOnNewSlotsAvailable === true,
          isArchived: false,
          createdAt:
            calendarSnapshot.exists()
              ? calendarSnapshot.data().createdAt ?? serverTimestamp()
              : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        doc(calendarAccessCollection(calendarId), params.uid),
        {
          calendarId,
          uid: params.uid,
          role: 'owner',
          email: trimmedEmail,
          username: nextUsername,
          addedAt: serverTimestamp(),
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

export function subscribeToCalendar(
  calendarId: string,
  onData: (calendar: CalendarRecord | null) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    calendarDoc(calendarId),
    (snapshot) => {
      onData(snapshot.exists() ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>) : null);
    },
    onError
  );
}

export function subscribeToOwnerCalendar(
  ownerUid: string,
  onData: (calendar: CalendarRecord | null) => void,
  onError: (error: Error) => void
) {
  let unsubscribeCalendar: (() => void) | null = null;

  return onSnapshot(
    userDoc(ownerUid),
    (userSnapshot) => {
      unsubscribeCalendar?.();
      unsubscribeCalendar = null;

      if (!userSnapshot.exists()) {
        onData(null);
        return;
      }

      const profile = mapOwnerProfile(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);

      if (!profile.defaultCalendarId) {
        onData(null);
        return;
      }

      unsubscribeCalendar = subscribeToCalendar(profile.defaultCalendarId, onData, onError);
    },
    onError
  );
}

export async function listJoinedCalendars(uid: string) {
  const snapshots = await getDocs(
    query(collectionGroup(db, 'access'), where('uid', '==', uid), where('role', '==', 'member'))
  );

  const calendarIds = Array.from(
    new Set(
      snapshots.docs
        .map((documentSnapshot) =>
          mapAccess(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>).calendarId
        )
        .filter(Boolean)
    )
  );

  const calendars = await Promise.all(
    calendarIds.map(async (calendarId) => {
      const snapshot = await getDoc(calendarDoc(calendarId));
      return snapshot.exists() ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
    })
  );

  return calendars.filter((calendar): calendar is CalendarRecord => calendar !== null);
}

export function subscribeToJoinedCalendars(
  uid: string,
  onData: (calendars: CalendarRecord[]) => void,
  onError: (error: Error) => void
) {
  const membershipsQuery = query(collectionGroup(db, 'access'), where('uid', '==', uid), where('role', '==', 'member'));

  return onSnapshot(
    membershipsQuery,
    (snapshot) => {
      void (async () => {
        try {
          const calendarIds = Array.from(
            new Set(
              snapshot.docs
                .map((documentSnapshot) =>
                  mapAccess(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>).calendarId
                )
                .filter(Boolean)
            )
          );

          const calendars = await Promise.all(
            calendarIds.map(async (calendarId) => {
              const calendarSnapshot = await getDoc(calendarDoc(calendarId));
              return calendarSnapshot.exists()
                ? mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>)
                : null;
            })
          );

          onData(calendars.filter((calendar): calendar is CalendarRecord => calendar !== null));
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Verbundene Kalender konnten nicht geladen werden.'));
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
    userConnectedCalendarPreferencesCollection(ownerUid),
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

export async function listUpcomingAppointmentsForParticipant(params: { uid: string; email: string }) {
  const [uidSnapshots, emailSnapshots] = await Promise.all([
    getDocs(
      query(
        collectionGroup(db, 'appointments'),
        where('participantUid', '==', params.uid),
        where('status', '==', 'booked'),
        orderBy('startsAt', 'asc'),
        limit(3)
      )
    ),
    getDocs(
      query(
        collectionGroup(db, 'appointments'),
        where('participantEmailKey', '==', normalizeEmail(params.email)),
        where('status', '==', 'booked'),
        orderBy('startsAt', 'asc'),
        limit(3)
      )
    ),
  ]);

  return Array.from(
    new Map(
      [...uidSnapshots.docs, ...emailSnapshots.docs].map((snapshot) => [
        snapshot.ref.path,
        mapAppointment(snapshot.id, snapshot.data() as Record<string, unknown>),
      ])
    ).values()
  )
    .sort((left, right) => (left.startsAt?.getTime() ?? 0) - (right.startsAt?.getTime() ?? 0))
    .slice(0, 3);
}

export async function listRecentNotificationsForRecipient(params: { uid: string; email: string }) {
  const [uidSnapshots, emailSnapshots] = await Promise.all([
    getDocs(
      query(notificationCollection(), where('recipientUid', '==', params.uid), orderBy('createdAt', 'desc'), limit(6))
    ),
    getDocs(
      query(
        notificationCollection(),
        where('recipientEmailKey', '==', normalizeEmail(params.email)),
        orderBy('createdAt', 'desc'),
        limit(6)
      )
    ),
  ]);

  return Array.from(
    new Map(
      [...uidSnapshots.docs, ...emailSnapshots.docs].map((snapshot) => [
        snapshot.id,
        mapNotification(snapshot.id, snapshot.data() as Record<string, unknown>),
      ])
    ).values()
  )
    .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0))
    .slice(0, 3);
}

export async function getDashboardData(params: { uid: string; email: string }) {
  await ensureOwnerAccountSetup(params);

  try {
    const ownerProfileResult = await getOwnerProfile(params.uid);
    const ownerCalendarId = ownerProfileResult?.defaultCalendarId ?? params.uid;
    const [ownerCalendarResult, joinedCalendarsResult, upcomingAppointmentsResult, recentNotificationsResult] =
      await Promise.allSettled([
        getOwnerCalendar(ownerCalendarId),
        listJoinedCalendars(params.uid),
        listUpcomingAppointmentsForParticipant(params),
        listRecentNotificationsForRecipient(params),
      ]);

    if (ownerCalendarResult.status === 'rejected') {
      console.warn('Dashboard owner calendar could not be loaded.', ownerCalendarResult.reason);
    }

    if (joinedCalendarsResult.status === 'rejected') {
      console.warn('Dashboard joined calendars could not be loaded.', joinedCalendarsResult.reason);
    }

    if (upcomingAppointmentsResult.status === 'rejected') {
      console.warn('Dashboard upcoming appointments could not be loaded.', upcomingAppointmentsResult.reason);
    }

    if (recentNotificationsResult.status === 'rejected') {
      console.warn('Dashboard notifications could not be loaded.', recentNotificationsResult.reason);
    }

    return {
      ownerProfile: ownerProfileResult,
      ownerCalendar: ownerCalendarResult.status === 'fulfilled' ? ownerCalendarResult.value : null,
      joinedCalendars: joinedCalendarsResult.status === 'fulfilled' ? joinedCalendarsResult.value : [],
      upcomingAppointments:
        upcomingAppointmentsResult.status === 'fulfilled' ? upcomingAppointmentsResult.value : [],
      recentNotifications:
        recentNotificationsResult.status === 'fulfilled' ? recentNotificationsResult.value : [],
    } satisfies DashboardData;
  } catch (error) {
    throw new Error(getDashboardLoadErrorMessage(error));
  }
}

export async function getAppointmentCalendarSettings(uid: string) {
  const snapshot = await getDoc(appointmentCalendarSettingsDoc(uid));
  return snapshot.exists()
    ? mapAppointmentCalendarSettings(snapshot.data() as Record<string, unknown>)
    : { hiddenCalendarIds: [] };
}

export function subscribeToAppointmentCalendarSettings(
  uid: string,
  onData: (settings: AppointmentCalendarSettings) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    appointmentCalendarSettingsDoc(uid),
    (snapshot) => {
      onData(
        snapshot.exists()
          ? mapAppointmentCalendarSettings(snapshot.data() as Record<string, unknown>)
          : { hiddenCalendarIds: [] }
      );
    },
    onError
  );
}

export async function updateAppointmentCalendarSettings(params: {
  uid: string;
  hiddenCalendarIds: string[];
}) {
  await runTransaction(db, async (transaction) => {
    transaction.set(
      appointmentCalendarSettingsDoc(params.uid),
      {
        hiddenCalendarIds: Array.from(
          new Set(params.hiddenCalendarIds.filter((calendarId) => calendarId.trim().length))
        ),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function listCalendarsByIds(calendarIds: string[]) {
  const uniqueCalendarIds = Array.from(
    new Set(calendarIds.filter((calendarId) => calendarId.trim().length))
  );

  const calendars = await Promise.all(
    uniqueCalendarIds.map(async (calendarId) => {
      const snapshot = await getDoc(calendarDoc(calendarId));
      return snapshot.exists()
        ? mapCalendar(snapshot.id, snapshot.data() as Record<string, unknown>)
        : null;
    })
  );

  return calendars.filter((calendar): calendar is CalendarRecord => calendar !== null);
}

export async function updateCalendarDescription(params: {
  calendarId: string;
  description: string;
}) {
  const trimmedDescription = params.description.trim();

  if (trimmedDescription.length > 120) {
    throw new Error('Die Beschreibung darf maximal 120 Zeichen lang sein.');
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(calendarDoc(params.calendarId));

    if (!snapshot.exists()) {
      throw new Error('Der Kalender existiert nicht mehr.');
    }

    transaction.set(
      calendarDoc(params.calendarId),
      {
        description: trimmedDescription || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function updateCalendarNotificationSettings(params: {
  calendarId: string;
  notifyOnNewSlotsAvailable: boolean;
}) {
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(calendarDoc(params.calendarId));

    if (!snapshot.exists()) {
      throw new Error('Der Kalender existiert nicht mehr.');
    }

    transaction.set(
      calendarDoc(params.calendarId),
      {
        notifyOnNewSlotsAvailable: params.notifyOnNewSlotsAvailable,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function updateCalendarVisibility(params: {
  calendarId: string;
  ownerId: string;
  visibility: CalendarRecord['visibility'];
  publicSlug: string;
}) {
  const normalizedSlug = params.publicSlug.trim() ? validatePublicSlug(params.publicSlug) : '';

  if (params.visibility === 'public' && !normalizedSlug) {
    throw new Error('Bitte hinterlege zuerst einen gueltigen Kalender-Link.');
  }

  await runTransaction(db, async (transaction) => {
    const calendarRef = calendarDoc(params.calendarId);
    const calendarSnapshot = await transaction.get(calendarRef);

    if (!calendarSnapshot.exists()) {
      throw new Error('Der Kalender existiert nicht mehr.');
    }

    const calendar = mapCalendar(calendarSnapshot.id, calendarSnapshot.data() as Record<string, unknown>);
    const currentSlug = calendar.calendarSlug ? normalizeSlug(calendar.calendarSlug) : '';
    const nextSlug = resolveStableCalendarSlug({
      currentCalendarSlug: currentSlug,
      requestedCalendarSlug: normalizedSlug || null,
    });

    if (nextSlug) {
      const slugRef = calendarSlugDoc(nextSlug);
      const slugSnapshot = await transaction.get(slugRef);
      const claimedCalendarId =
        slugSnapshot.exists() && typeof slugSnapshot.data().calendarId === 'string'
          ? slugSnapshot.data().calendarId
          : null;

      if (claimedCalendarId && claimedCalendarId !== params.calendarId) {
        throw new Error('Dieser Kalender-Link ist bereits vergeben.');
      }

      transaction.set(
        slugRef,
        {
          calendarSlug: nextSlug,
          calendarId: params.calendarId,
          updatedAt: serverTimestamp(),
          createdAt: slugSnapshot.exists() ? slugSnapshot.data().createdAt ?? serverTimestamp() : serverTimestamp(),
        },
        { merge: true }
      );
    }

    transaction.set(
      calendarRef,
      {
        ownerUid: params.ownerId,
        visibility: params.visibility,
        calendarSlug: nextSlug,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function saveCalendarPublicSlug(params: {
  calendarId: string;
  ownerId: string;
  visibility: CalendarRecord['visibility'];
  publicSlug: string;
}) {
  await updateCalendarVisibility({
    calendarId: params.calendarId,
    ownerId: params.ownerId,
    visibility: params.visibility,
    publicSlug: params.publicSlug,
  });
}

export async function setConnectedCalendarFavorite(params: {
  ownerUid: string;
  calendarId: string;
  isFavorite: boolean;
}) {
  await runTransaction(db, async (transaction) => {
    const calendarSnapshot = await transaction.get(calendarDoc(params.calendarId));

    if (!calendarSnapshot.exists()) {
      throw new Error('Der ausgewaehlte Kalender existiert nicht mehr.');
    }

    transaction.set(
      doc(userConnectedCalendarPreferencesCollection(params.ownerUid), params.calendarId),
      {
        calendarId: params.calendarId,
        isFavorite: params.isFavorite,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}
