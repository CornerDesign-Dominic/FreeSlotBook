import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from './config';

// Register a new user with email/password.
export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Log in an existing user with email/password.
export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Log out the current user.
export async function logout() {
  return signOut(auth);
}

// Send a password reset email.
export async function sendResetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
