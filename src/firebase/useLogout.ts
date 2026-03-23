import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';

import { logout as signOutUser } from './auth';

export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await signOutUser();
      router.dismissAll();
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  return { logout, isLoggingOut };
}
