import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collectionGroup: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ type: 'query', args })),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  setDoc: vi.fn(),
  where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
}));

vi.mock('@/src/firebase/config', () => ({
  db: { mocked: true },
}));

vi.mock('../../src/domain/repository-core', () => ({
  getCalendarBySlug: vi.fn(),
  getOwnerCalendar: vi.fn(),
  getOwnerProfile: vi.fn(),
  getUserProfileByEmail: vi.fn(),
  getUserProfileByUsername: vi.fn(),
}));

vi.mock('../../src/domain/repository-shared', () => ({
  calendarAccessCollection: vi.fn((calendarId: string) => ({ path: `calendars/${calendarId}/access` })),
  calendarAccessDoc: vi.fn((calendarId: string, uid: string) => ({ path: `calendars/${calendarId}/access/${uid}` })),
  calendarAccessRequestDoc: vi.fn((calendarId: string, uid: string) => ({
    path: `calendars/${calendarId}/accessRequests/${uid}`,
  })),
  calendarAccessRequestsCollection: vi.fn((calendarId: string) => ({
    path: `calendars/${calendarId}/accessRequests`,
  })),
  calendarInvitesCollection: vi.fn((calendarId: string) => ({ path: `calendars/${calendarId}/invites` })),
  calendarInviteDoc: vi.fn((calendarId: string, uid: string) => ({ path: `calendars/${calendarId}/invites/${uid}` })),
  mapAccess: vi.fn((id: string, data: Record<string, unknown>) => ({
    id,
    uid: String(data.uid ?? id),
    role: data.role === 'owner' ? 'owner' : 'member',
    email: String(data.email ?? ''),
    username: typeof data.username === 'string' ? data.username : null,
  })),
  mapAccessRequest: vi.fn((id: string, data: Record<string, unknown>) => ({
    id,
    requesterUid: String(data.requesterUid ?? id),
    requesterEmail: String(data.requesterEmail ?? ''),
    requesterUsername: typeof data.requesterUsername === 'string' ? data.requesterUsername : null,
    status: data.status ?? 'pending',
    calendarId: String(data.calendarId ?? ''),
    calendarSlug: typeof data.calendarSlug === 'string' ? data.calendarSlug : null,
  })),
  mapInvite: vi.fn((id: string, data: Record<string, unknown>) => ({
    id,
    invitedUid: String(data.invitedUid ?? id),
    invitedEmail: String(data.invitedEmail ?? ''),
    invitedUsername: typeof data.invitedUsername === 'string' ? data.invitedUsername : null,
    invitedByUid: String(data.invitedByUid ?? ''),
    status: data.status ?? 'pending',
    calendarId: String(data.calendarId ?? ''),
  })),
  userConnectedCalendarPreferenceDoc: vi.fn((uid: string, calendarId: string) => ({
    path: `users/${uid}/connectedCalendarPreferences/${calendarId}`,
  })),
}));

function documentSnapshot(data?: Record<string, unknown>): any {
  return {
    exists: () => Boolean(data),
    data: () => data,
    id: 'mocked-id',
    metadata: {},
    get: vi.fn(),
    toJSON: vi.fn(),
    ref: { path: 'mocked/ref' },
  };
}

async function loadMembershipModule() {
  const firestore = await import('firebase/firestore');
  const repositoryCore = await import('../../src/domain/repository-core');
  const repositoryMembership = await import('../../src/domain/repository-membership');

  return {
    firestore,
    repositoryCore,
    repositoryMembership,
  };
}

describe('Membership domain guards', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('request flow rejects duplicate pending requests for the same user', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getCalendarBySlug).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
      visibility: 'private',
      calendarSlug: 'owner-calendar',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(
        documentSnapshot({
          calendarId: 'calendar_1',
          requesterUid: 'member_1',
          requesterEmail: 'member@example.com',
          requesterUsername: 'memberuser',
          status: 'pending',
        })
      );

    await expect(
      repositoryMembership.requestCalendarAccessBySlug({
        slug: 'owner-calendar',
        requesterUid: 'member_1',
        requesterEmail: 'member@example.com',
      })
    ).rejects.toThrow('Du hast bereits eine Anfrage zu diesem Kalender gesendet.');

    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  test('request flow rejects a new request when a pending invite already exists', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getCalendarBySlug).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
      visibility: 'private',
      calendarSlug: 'owner-calendar',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(
        documentSnapshot({
          calendarId: 'calendar_1',
          invitedUid: 'member_1',
          invitedEmail: 'member@example.com',
          invitedUsername: 'memberuser',
          status: 'pending',
        })
      );

    await expect(
      repositoryMembership.requestCalendarAccessBySlug({
        slug: 'owner-calendar',
        requesterUid: 'member_1',
        requesterEmail: 'member@example.com',
      })
    ).rejects.toThrow('Für dich liegt bereits eine offene Einladung zu diesem Kalender vor.');

    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  test('request flow rejects requests for the own calendar', async () => {
    const { repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getCalendarBySlug).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'member_1',
      visibility: 'private',
      calendarSlug: 'owner-calendar',
    } as never);

    await expect(
      repositoryMembership.requestCalendarAccessBySlug({
        slug: 'owner-calendar',
        requesterUid: 'member_1',
        requesterEmail: 'member@example.com',
      })
    ).rejects.toThrow('Für den eigenen Kalender musst du keine Anfrage stellen.');
  });

  test('invite flow resolves usernames from user links and stores a pending invite', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerCalendar).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'owner_1',
      username: 'owneruser',
      email: 'owner@example.com',
      subscriptionTier: 'free',
    } as never);
    vi.mocked(repositoryCore.getUserProfileByUsername).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(documentSnapshot());
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce({ docs: [] } as never)
      .mockResolvedValueOnce({ docs: [] } as never);

    await repositoryMembership.createCalendarInvite({
      calendarId: 'calendar_1',
      ownerUid: 'owner_1',
      inviteeIdentifier: 'https://slotlyme.app/user/memberuser',
    });

    expect(repositoryCore.getUserProfileByUsername).toHaveBeenCalledWith('memberuser');
    expect(firestore.setDoc).toHaveBeenCalledTimes(1);
  });

  test('invite flow rejects self invites', async () => {
    const { repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerCalendar).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'owner_1',
      username: 'owneruser',
      email: 'owner@example.com',
      subscriptionTier: 'free',
    } as never);
    vi.mocked(repositoryCore.getUserProfileByUsername).mockResolvedValue({
      uid: 'owner_1',
      username: 'owneruser',
      email: 'owner@example.com',
    } as never);

    await expect(
      repositoryMembership.createCalendarInvite({
        calendarId: 'calendar_1',
        ownerUid: 'owner_1',
        inviteeIdentifier: 'owneruser',
      })
    ).rejects.toThrow('Du kannst dich nicht selbst einladen.');
  });

  test('invite flow rejects duplicate pending invites', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerCalendar).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'owner_1',
      username: 'owneruser',
      email: 'owner@example.com',
      subscriptionTier: 'free',
    } as never);
    vi.mocked(repositoryCore.getUserProfileByUsername).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(
        documentSnapshot({
          calendarId: 'calendar_1',
          invitedUid: 'member_1',
          invitedEmail: 'member@example.com',
          invitedUsername: 'memberuser',
          status: 'pending',
        })
      );

    await expect(
      repositoryMembership.createCalendarInvite({
        calendarId: 'calendar_1',
        ownerUid: 'owner_1',
        inviteeIdentifier: 'memberuser',
      })
    ).rejects.toThrow('Für diese Person ist bereits eine Einladung offen.');

    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  test('invite flow rejects inviting users with an open pending request', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerCalendar).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'owner_1',
      username: 'owneruser',
      email: 'owner@example.com',
      subscriptionTier: 'free',
    } as never);
    vi.mocked(repositoryCore.getUserProfileByUsername).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(
        documentSnapshot({
          calendarId: 'calendar_1',
          requesterUid: 'member_1',
          requesterEmail: 'member@example.com',
          requesterUsername: 'memberuser',
          status: 'pending',
        })
      );

    await expect(
      repositoryMembership.createCalendarInvite({
        calendarId: 'calendar_1',
        ownerUid: 'owner_1',
        inviteeIdentifier: 'memberuser',
      })
    ).rejects.toThrow('Für diese Person liegt bereits eine offene Zugriffsanfrage vor.');

    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  test('invite flow rejects inviting already connected users', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerCalendar).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile).mockResolvedValue({
      uid: 'owner_1',
      username: 'owneruser',
      email: 'owner@example.com',
      subscriptionTier: 'free',
    } as never);
    vi.mocked(repositoryCore.getUserProfileByUsername).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
    } as never);
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      documentSnapshot({
        calendarId: 'calendar_1',
        uid: 'member_1',
        role: 'member',
        email: 'member@example.com',
        username: 'memberuser',
      })
    );

    await expect(
      repositoryMembership.createCalendarInvite({
        calendarId: 'calendar_1',
        ownerUid: 'owner_1',
        inviteeIdentifier: 'memberuser',
      })
    ).rejects.toThrow('Diese Person ist bereits Mitglied dieses Kalenders.');
  });

  test('invite flow blocks new whitelist entries when the free tier limit is reached', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerCalendar).mockResolvedValue({
      id: 'calendar_1',
      ownerUid: 'owner_1',
      ownerEmail: 'owner@example.com',
    } as never);
    vi.mocked(repositoryCore.getOwnerProfile)
      .mockResolvedValueOnce({
        uid: 'owner_1',
        username: 'owneruser',
        email: 'owner@example.com',
        subscriptionTier: 'free',
      } as never);
    vi.mocked(repositoryCore.getUserProfileByUsername).mockResolvedValue({
      uid: 'member_1',
      username: 'memberuser',
      email: 'member@example.com',
      subscriptionTier: 'free',
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(documentSnapshot())
      .mockResolvedValueOnce(documentSnapshot());
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce({
        docs: Array.from({ length: 25 }, (_, index) =>
          documentSnapshot({
            uid: `member_${index}`,
            role: 'member',
            email: `member_${index}@example.com`,
          })
        ),
      } as never)
      .mockResolvedValueOnce({ docs: [] } as never);

    await expect(
      repositoryMembership.createCalendarInvite({
        calendarId: 'calendar_1',
        ownerUid: 'owner_1',
        inviteeIdentifier: 'memberuser',
      })
    ).rejects.toThrow('Das Whitelist-Limit dieses Kalenders ist erreicht.');
  });

  test('approving a request is blocked when the calendar whitelist limit is already reached', async () => {
    const { firestore, repositoryCore, repositoryMembership } = await loadMembershipModule();

    vi.mocked(repositoryCore.getOwnerProfile)
      .mockResolvedValueOnce({
        uid: 'member_1',
        username: 'memberuser',
        email: 'member@example.com',
        subscriptionTier: 'free',
      } as never)
      .mockResolvedValueOnce({
        uid: 'owner_1',
        username: 'owneruser',
        email: 'owner@example.com',
        subscriptionTier: 'free',
      } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(
        documentSnapshot({
          calendarId: 'calendar_1',
          uid: 'owner_1',
          role: 'owner',
          email: 'owner@example.com',
          username: 'owneruser',
        })
      )
      .mockResolvedValueOnce(
        documentSnapshot({
          calendarId: 'calendar_1',
          requesterUid: 'member_1',
          requesterEmail: 'member@example.com',
          requesterUsername: 'memberuser',
          status: 'pending',
        })
      );
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce({
        docs: Array.from({ length: 25 }, (_, index) =>
          documentSnapshot({
            uid: `member_${index}`,
            role: 'member',
            email: `member_${index}@example.com`,
          })
        ),
      } as never)
      .mockResolvedValueOnce({ docs: [] } as never);

    await expect(
      repositoryMembership.approveCalendarAccessRequest({
        calendarId: 'calendar_1',
        ownerId: 'owner_1',
        requesterUid: 'member_1',
      })
    ).rejects.toThrow('Das Whitelist-Limit dieses Kalenders ist erreicht.');
  });
});
