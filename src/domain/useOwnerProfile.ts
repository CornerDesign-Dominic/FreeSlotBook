import { useEffect, useState } from 'react';

import { ensureOwnerAccountSetup, getOwnerProfile } from './repository';
import type { OwnerProfile } from './types';

export function useOwnerProfile(user: { uid: string; email: string | null } | null) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ownerUid = user?.uid ?? null;
  const ownerEmail = user?.email ?? null;

  useEffect(() => {
    if (!ownerUid || !ownerEmail) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    const ownerUser = { uid: ownerUid, email: ownerEmail };

    let isCancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        await ensureOwnerAccountSetup(ownerUser);
        const nextProfile = await getOwnerProfile(ownerUser.uid);

        if (isCancelled) {
          return;
        }

        setProfile(nextProfile);
        setLoading(false);
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Das Profil konnte nicht geladen werden.'
        );
        setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [ownerEmail, ownerUid]);

  return { profile, loading, error };
}
