import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getReactNativePersistence,
  initializeAuth,
} from '@firebase/auth/dist/rn/index';

import { app, db } from './config.shared';

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export { app, db };
