import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { ensureOwnerAccountSetup, upsertOwnerDeviceToken } from './repository';
import { useAuth } from '../firebase/useAuth';

function isExpoGo() {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  );
}

export function useNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    const currentUser = user;

    if (!currentUser?.email) {
      return;
    }
    const ownerUser = { uid: currentUser.uid, email: currentUser.email };

    let isActive = true;
    let responseSubscription: { remove: () => void } | null = null;

    async function setupNotifications() {
      try {
        if (isExpoGo()) {
          return;
        }

        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
          // Navigation from notifications can be added later on top of this listener.
        });

        await ensureOwnerAccountSetup(ownerUser);

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
          ownerUid: ownerUser.uid,
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
      responseSubscription?.remove();
    };
  }, [user]);
}
