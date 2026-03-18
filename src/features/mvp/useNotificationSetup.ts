import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { ensureOwnerAccountSetup, upsertOwnerDeviceToken } from './repository';
import { useAuth } from '../../firebase/useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    let isActive = true;
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      // Navigation from notifications can be added later on top of this listener.
    });

    async function setupNotifications() {
      try {
        await ensureOwnerAccountSetup({ uid: user.uid, email: user.email ?? '' });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const permissionStatus = await Notifications.getPermissionsAsync();
        let finalStatus = permissionStatus.status;

        if (finalStatus !== 'granted') {
          const requestedStatus = await Notifications.requestPermissionsAsync();
          finalStatus = requestedStatus.status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
          return;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

        if (!isActive || !tokenResponse.data) {
          return;
        }

        await upsertOwnerDeviceToken({
          ownerUid: user.uid,
          expoPushToken: tokenResponse.data,
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        });
      } catch {
        // Push setup should not break app startup.
      }
    }

    setupNotifications();

    return () => {
      isActive = false;
      responseSubscription.remove();
    };
  }, [user?.email, user?.uid]);
}
