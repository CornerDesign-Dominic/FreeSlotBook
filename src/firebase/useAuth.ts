import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth } from './config';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth changes.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
}
