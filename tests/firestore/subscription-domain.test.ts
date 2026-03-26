import { beforeEach, describe, expect, test, vi } from 'vitest';

const serverTimestamp = vi.fn(() => 'SERVER_TIMESTAMP');

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...segments: unknown[]) => ({
    type: 'collection',
    path: segments.filter((segment) => typeof segment === 'string').join('/'),
  })),
  collectionGroup: vi.fn(),
  doc: vi.fn((...args: unknown[]) => {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] && 'path' in (args[0] as Record<string, unknown>)) {
      const parent = args[0] as { path: string };
      return { path: `${parent.path}/generated-calendar`, id: 'generated-calendar' };
    }

    const segments = args.filter((segment) => typeof segment === 'string') as string[];
    const id = segments[segments.length - 1] ?? 'generated';
    return { path: segments.join('/'), id };
  }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ type: 'query', args })),
  runTransaction: vi.fn(),
  serverTimestamp,
  where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
}));

vi.mock('@/src/firebase/config', () => ({
  db: { mocked: true },
}));

vi.mock('../../src/domain/calendar-slug-policy', () => ({
  normalizeExistingUsername: vi.fn((value: unknown) => (typeof value === 'string' ? value.trim() : null)),
  resolveStableCalendarSlug: vi.fn((params: { currentCalendarSlug?: string | null; requestedCalendarSlug?: string | null }) =>
    params.requestedCalendarSlug ?? params.currentCalendarSlug ?? null
  ),
}));

vi.mock('../../src/domain/repository-shared', () => ({
  appointmentCalendarSettingsDoc: vi.fn((uid: string) => ({ path: `users/${uid}/settings/appointmentCalendar`, id: 'appointmentCalendar' })),
  calendarAccessCollection: vi.fn((calendarId: string) => ({ path: `calendars/${calendarId}/access` })),
  calendarDoc: vi.fn((calendarId: string) => ({ path: `calendars/${calendarId}`, id: calendarId })),
  calendarSlugDoc: vi.fn((slug: string) => ({ path: `calendarSlugs/${slug}`, id: slug })),
  emailDoc: vi.fn((emailKey: string) => ({ path: `emails/${emailKey}`, id: emailKey })),
  getDashboardLoadErrorMessage: vi.fn(() => 'Dashboard load failed'),
  mapAccess: vi.fn(),
  mapAppointmentCalendarSettings: vi.fn(),
  mapAppointment: vi.fn(),
  mapCalendar: vi.fn((id: string, data: Record<string, unknown>) => ({
    id,
    ownerUid: String(data.ownerUid ?? ''),
    ownerEmail: String(data.ownerEmail ?? ''),
    ownerUsername: typeof data.ownerUsername === 'string' ? data.ownerUsername : null,
    title: typeof data.title === 'string' ? data.title : 'Mein Kalender',
    visibility: data.visibility === 'public' ? 'public' : 'private',
    calendarSlug: typeof data.calendarSlug === 'string' ? data.calendarSlug : null,
    publicSlug: typeof data.calendarSlug === 'string' ? data.calendarSlug : null,
    description: typeof data.description === 'string' ? data.description : null,
    notifyOnNewSlotsAvailable: Boolean(data.notifyOnNewSlotsAvailable),
    isArchived: Boolean(data.isArchived),
  })),
  mapNotification: vi.fn(),
  mapOwnerProfile: vi.fn((id: string, data: Record<string, unknown>) => ({
    uid: String(data.uid ?? id),
    email: String(data.email ?? ''),
    emailKey: String(data.emailKey ?? ''),
    username: typeof data.username === 'string' ? data.username : null,
    slotlymeId: typeof data.username === 'string' ? data.username : null,
    defaultCalendarId: typeof data.defaultCalendarId === 'string' ? data.defaultCalendarId : null,
    subscriptionTier: data.subscriptionTier === 'pro' ? 'pro' : data.subscriptionTier === 'plus' ? 'plus' : 'free',
    primaryIdentityType: 'email',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  })),
  normalizeEmail: vi.fn((value: string) => value.trim().toLowerCase()),
  normalizeSlug: vi.fn((value: string) => value.trim().toLowerCase()),
  normalizeUsername: vi.fn((value: string) => value.trim().toLowerCase()),
  notificationCollection: vi.fn(),
  reservedPublicSlugs: new Set(['login', 'register']),
  userConnectedCalendarPreferencesCollection: vi.fn((uid: string) => ({ path: `users/${uid}/connectedCalendarPreferences` })),
  userDoc: vi.fn((uid: string) => ({ path: `users/${uid}`, id: uid })),
  usernameDoc: vi.fn((username: string) => ({ path: `usernames/${username}`, id: username })),
}));

function documentSnapshot(id = 'mocked-id', data: Record<string, unknown> | null = null) {
  return {
    id,
    exists: () => Boolean(data),
    data: () => data ?? {},
  };
}

function querySnapshot(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
  return { docs };
}

async function loadRepositoryCoreModule() {
  const firestore = await import('firebase/firestore');
  const repositoryCore = await import('../../src/domain/repository-core');

  return {
    firestore,
    repositoryCore,
  };
}

describe('Subscription domain logic', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('new users receive the free tier during owner setup', async () => {
    const { firestore, repositoryCore } = await loadRepositoryCoreModule();
    const setCalls: Array<{ path: string; data: Record<string, unknown> }> = [];

    vi.mocked(firestore.runTransaction).mockImplementation(async (_db, updateFn) =>
      updateFn({
        get: vi.fn(async () => documentSnapshot('missing')),
        set: vi.fn((ref, data) => {
          setCalls.push({ path: (ref as { path: string }).path, data: data as Record<string, unknown> });
        }),
      } as never)
    );

    await repositoryCore.ensureOwnerAccountSetup({
      uid: 'user_1',
      email: 'user@example.com',
      slotlymeId: 'user-one',
    });

    const userWrite = setCalls.find((call) => call.path === 'users/user_1');
    expect(userWrite?.data.subscriptionTier).toBe('free');
  });

  test('subscription tier can be updated from free to plus to pro without deleting data', async () => {
    const { firestore, repositoryCore } = await loadRepositoryCoreModule();
    const setCalls: Array<{ path: string; data: Record<string, unknown> }> = [];

    vi.mocked(firestore.runTransaction).mockImplementation(async (_db, updateFn) =>
      updateFn({
        get: vi.fn(async () =>
          documentSnapshot('user_1', {
            uid: 'user_1',
            email: 'user@example.com',
            subscriptionTier: 'free',
          })
        ),
        set: vi.fn((ref, data) => {
          setCalls.push({ path: (ref as { path: string }).path, data: data as Record<string, unknown> });
        }),
      } as never)
    );

    await repositoryCore.updateUserSubscriptionTier({ uid: 'user_1', subscriptionTier: 'plus' });
    await repositoryCore.updateUserSubscriptionTier({ uid: 'user_1', subscriptionTier: 'pro' });

    expect(setCalls.map((call) => call.data.subscriptionTier)).toEqual(['plus', 'pro']);
  });

  test('free users can not create a second calendar', async () => {
    const { firestore, repositoryCore } = await loadRepositoryCoreModule();

    vi.mocked(firestore.getDoc).mockResolvedValue(
      documentSnapshot('user_1', {
        uid: 'user_1',
        email: 'user@example.com',
        username: 'owneruser',
        subscriptionTier: 'free',
      }) as never
    );
    vi.mocked(firestore.getDocs).mockResolvedValue(
      querySnapshot([
        documentSnapshot('calendar_1', {
          ownerUid: 'user_1',
          ownerEmail: 'user@example.com',
          title: 'Mein Kalender',
          visibility: 'private',
          isArchived: false,
        }),
      ]) as never
    );
    vi.mocked(firestore.runTransaction).mockImplementation(async (_db, updateFn) =>
      updateFn({
        get: vi.fn(async () =>
          documentSnapshot('user_1', {
            uid: 'user_1',
            email: 'user@example.com',
            username: 'owneruser',
            subscriptionTier: 'free',
          })
        ),
        set: vi.fn(),
      } as never)
    );

    await expect(
      repositoryCore.createOwnerCalendar({
        ownerUid: 'user_1',
        ownerEmail: 'user@example.com',
      })
    ).rejects.toThrow('Im Free-Tarif kannst du nur einen privaten Kalender anlegen.');
  });

  test('plus users can create a fifth calendar but not a sixth', async () => {
    const { firestore, repositoryCore } = await loadRepositoryCoreModule();
    const setCalls: Array<string> = [];

    vi.mocked(firestore.getDoc).mockResolvedValue(
      documentSnapshot('user_1', {
        uid: 'user_1',
        email: 'user@example.com',
        username: 'owneruser',
        subscriptionTier: 'plus',
      }) as never
    );
    vi.mocked(firestore.runTransaction)
      .mockImplementationOnce(async (_db, updateFn) =>
        updateFn({
          get: vi.fn(async () =>
            documentSnapshot('user_1', {
              uid: 'user_1',
              email: 'user@example.com',
              username: 'owneruser',
              subscriptionTier: 'plus',
            })
          ),
          set: vi.fn((ref) => {
            setCalls.push((ref as { path: string }).path);
          }),
        } as never)
      )
      .mockImplementationOnce(async (_db, updateFn) =>
        updateFn({
          get: vi.fn(async () =>
            documentSnapshot('user_1', {
              uid: 'user_1',
              email: 'user@example.com',
              username: 'owneruser',
              subscriptionTier: 'plus',
            })
          ),
          set: vi.fn(),
        } as never)
      );

    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce(
        querySnapshot(
          Array.from({ length: 4 }, (_, index) =>
            documentSnapshot(`calendar_${index + 1}`, {
              ownerUid: 'user_1',
              ownerEmail: 'user@example.com',
              title: `Kalender ${index + 1}`,
              visibility: 'private',
              isArchived: false,
            })
          )
        ) as never
      )
      .mockResolvedValueOnce(
        querySnapshot(
          Array.from({ length: 5 }, (_, index) =>
            documentSnapshot(`calendar_${index + 1}`, {
              ownerUid: 'user_1',
              ownerEmail: 'user@example.com',
              title: `Kalender ${index + 1}`,
              visibility: 'private',
              isArchived: false,
            })
          )
        ) as never
      );

    await expect(
      repositoryCore.createOwnerCalendar({
        ownerUid: 'user_1',
        ownerEmail: 'user@example.com',
      })
    ).resolves.toEqual({ calendarId: 'generated-calendar' });

    expect(setCalls).toContain('calendars/generated-calendar');

    await expect(
      repositoryCore.createOwnerCalendar({
        ownerUid: 'user_1',
        ownerEmail: 'user@example.com',
      })
    ).rejects.toThrow('Im Plus-Tarif kannst du maximal 5 Kalender anlegen.');
  });

  test('public calendar limits are enforced for free, plus and pro', async () => {
    const { firestore, repositoryCore } = await loadRepositoryCoreModule();

    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(
        documentSnapshot('user_1', {
          uid: 'user_1',
          email: 'user@example.com',
          subscriptionTier: 'free',
        }) as never
      )
      .mockResolvedValueOnce(
        documentSnapshot('user_1', {
          uid: 'user_1',
          email: 'user@example.com',
          subscriptionTier: 'plus',
        }) as never
      )
      .mockResolvedValueOnce(
        documentSnapshot('user_1', {
          uid: 'user_1',
          email: 'user@example.com',
          subscriptionTier: 'pro',
        }) as never
      );
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce(querySnapshot([]) as never)
      .mockResolvedValueOnce(
        querySnapshot([
          documentSnapshot('calendar_public_1', {
            ownerUid: 'user_1',
            ownerEmail: 'user@example.com',
            visibility: 'public',
            calendarSlug: 'plus-public-1',
            isArchived: false,
          }),
        ]) as never
      )
      .mockResolvedValueOnce(
        querySnapshot([
          documentSnapshot('calendar_public_1', {
            ownerUid: 'user_1',
            ownerEmail: 'user@example.com',
            visibility: 'public',
            calendarSlug: 'pro-public-1',
            isArchived: false,
          }),
          documentSnapshot('calendar_public_2', {
            ownerUid: 'user_1',
            ownerEmail: 'user@example.com',
            visibility: 'public',
            calendarSlug: 'pro-public-2',
            isArchived: false,
          }),
        ]) as never
      );
    vi.mocked(firestore.runTransaction).mockImplementation(async (_db, updateFn) =>
      updateFn({
        get: vi.fn(async (ref) => {
          const path = (ref as { path?: string }).path;

          if (path?.includes('calendars/calendar_1')) {
            return documentSnapshot('calendar_1', {
              ownerUid: 'user_1',
              ownerEmail: 'user@example.com',
              visibility: 'private',
              calendarSlug: null,
            });
          }

          if (path?.includes('calendars/calendar_2')) {
            return documentSnapshot('calendar_2', {
              ownerUid: 'user_1',
              ownerEmail: 'user@example.com',
              visibility: 'private',
              calendarSlug: null,
            });
          }

          if (path?.includes('calendars/calendar_3')) {
            return documentSnapshot('calendar_3', {
              ownerUid: 'user_1',
              ownerEmail: 'user@example.com',
              visibility: 'private',
              calendarSlug: null,
            });
          }

          if (path?.includes('calendarSlugs/pro-public-3')) {
            return documentSnapshot('pro-public-3');
          }

          return documentSnapshot();
        }),
        set: vi.fn(),
      } as never)
    );

    await expect(
      repositoryCore.updateCalendarVisibility({
        calendarId: 'calendar_1',
        ownerId: 'user_1',
        visibility: 'public',
        publicSlug: 'free-public',
      })
    ).rejects.toThrow('Dein aktueller Tarif erlaubt keine öffentlichen Kalender.');

    await expect(
      repositoryCore.updateCalendarVisibility({
        calendarId: 'calendar_2',
        ownerId: 'user_1',
        visibility: 'public',
        publicSlug: 'plus-public-2',
      })
    ).rejects.toThrow('Im Plus-Tarif ist maximal ein öffentlicher Kalender möglich.');

    await expect(
      repositoryCore.updateCalendarVisibility({
        calendarId: 'calendar_3',
        ownerId: 'user_1',
        visibility: 'public',
        publicSlug: 'pro-public-3',
      })
    ).resolves.toBeUndefined();
  });

  test('after a downgrade, new over-limit calendar growth is blocked', async () => {
    const { firestore, repositoryCore } = await loadRepositoryCoreModule();
    vi.mocked(firestore.getDoc).mockResolvedValue(
      documentSnapshot('user_1', {
        uid: 'user_1',
        email: 'user@example.com',
        username: 'owneruser',
        subscriptionTier: 'free',
      }) as never
    );
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(
      querySnapshot(
        Array.from({ length: 3 }, (_, index) =>
          documentSnapshot(`calendar_${index + 1}`, {
            ownerUid: 'user_1',
            ownerEmail: 'user@example.com',
            title: `Kalender ${index + 1}`,
            visibility: 'private',
            isArchived: false,
          })
        )
      ) as never
    );
    vi.mocked(firestore.runTransaction).mockImplementation(async (_db, updateFn) =>
      updateFn({
        get: vi.fn(async () =>
          documentSnapshot('user_1', {
            uid: 'user_1',
            email: 'user@example.com',
            username: 'owneruser',
            subscriptionTier: 'free',
          })
        ),
        set: vi.fn(),
      } as never)
    );

    await expect(
      repositoryCore.createOwnerCalendar({
        ownerUid: 'user_1',
        ownerEmail: 'user@example.com',
      })
    ).rejects.toThrow('Im Free-Tarif kannst du nur einen privaten Kalender anlegen.');
  });
});
