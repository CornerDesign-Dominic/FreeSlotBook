import { useCallback, useState } from 'react';

import { logout as signOutUser } from './auth';

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await signOutUser();
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  return { logout, isLoggingOut };
}
