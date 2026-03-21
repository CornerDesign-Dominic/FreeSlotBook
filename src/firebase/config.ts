import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAuth } from 'firebase/auth';
import {
  getReactNativePersistence,
  initializeAuth,
} from '@firebase/auth/dist/rn/index';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8ytOXLgN4sfZqB2VVvZN3BkBLOulcYzc",
  authDomain: "freeslotbooking.firebaseapp.com",
  projectId: "freeslotbooking",
  storageBucket: "freeslotbooking.firebasestorage.app",
  messagingSenderId: "1068486038430",
  appId: "1:1068486038430:web:07c8c0bf00cc3113727c8f"
};


const app = initializeApp(firebaseConfig);

export const auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
export const db = getFirestore(app);
