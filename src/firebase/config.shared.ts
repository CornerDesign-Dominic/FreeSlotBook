import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB8ytOXLgN4sfZqB2VVvZN3BkBLOulcYzc',
  authDomain: 'freeslotbooking.firebaseapp.com',
  projectId: 'freeslotbooking',
  storageBucket: 'freeslotbooking.firebasestorage.app',
  messagingSenderId: '1068486038430',
  appId: '1:1068486038430:web:07c8c0bf00cc3113727c8f',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
