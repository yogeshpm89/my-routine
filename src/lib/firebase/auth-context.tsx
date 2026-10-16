'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth, isFirebaseConfigured } from './config';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const LOCAL_GUEST_KEY = 'my_routine_local_guest';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  useEffect(() => {
    // Check if user previously chosen local guest/demo mode
    const storedGuest = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_GUEST_KEY) : null;
    if (storedGuest) {
      try {
        const guestData = JSON.parse(storedGuest);
        setUser(guestData);
        setIsDemoMode(true);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(LOCAL_GUEST_KEY);
      }
    }

    if (!isFirebaseConfigured) {
      // Automatic fallback to local guest profile so the app works immediately out of the box
      const defaultLocalUser: AppUser = {
        uid: 'local-default-user',
        email: 'local@myroutine.local',
        displayName: 'My Routine User',
        isAnonymous: true,
      };
      setUser(defaultLocalUser);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isAnonymous: false,
          photoURL: firebaseUser.photoURL,
        });
        setIsDemoMode(false);
        setLoading(false);
      } else {
        setUser(null);
        setIsDemoMode(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    if (!isFirebaseConfigured) {
      const guest: AppUser = {
        uid: 'user_' + btoa(email).slice(0, 8),
        email,
        displayName: email.split('@')[0],
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
      setUser(guest);
      setIsDemoMode(false);
      return;
    }
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    setUser({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || email.split('@')[0],
      isAnonymous: false,
      photoURL: cred.user.photoURL,
    });
  };

  const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
    if (!isFirebaseConfigured) {
      const guest: AppUser = {
        uid: 'user_' + btoa(email).slice(0, 8),
        email,
        displayName: displayName || email.split('@')[0],
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
      setUser(guest);
      setIsDemoMode(false);
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    setUser({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || cred.user.displayName || email.split('@')[0],
      isAnonymous: false,
      photoURL: cred.user.photoURL,
    });
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      const guest: AppUser = {
        uid: 'user_google_demo',
        email: 'google.user@example.com',
        displayName: 'Google User',
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
      setUser(guest);
      setIsDemoMode(false);
      return;
    }
    const isNative = typeof window !== 'undefined' && (
      Capacitor.isNativePlatform() ||
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      Boolean((window as any).androidBridge)
    );

    if (isNative) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      let result;
      try {
        result = await FirebaseAuthentication.signInWithGoogle();
      } catch (nativeErr: any) {
        console.warn('Credential Manager failed, attempting GoogleSignInClient fallback:', nativeErr);
        result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
      }

      const idToken = result.credential?.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Google User',
          isAnonymous: false,
          photoURL: cred.user.photoURL,
        });
        return;
      }
      if (result.user) {
        setUser({
          uid: result.user.uid,
          email: result.user.email || null,
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
          isAnonymous: false,
          photoURL: result.user.photoUrl,
        });
        return;
      }
      throw new Error('Google Sign-In completed but no user credentials were returned.');
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    setUser({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Google User',
      isAnonymous: false,
      photoURL: cred.user.photoURL,
    });
  };

  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured) return;
    await firebaseSendPasswordResetEmail(auth, email);
  };

  const signInAnonymously = async () => {
    continueAsGuest();
  };

  const continueAsGuest = () => {
    const guest: AppUser = {
      uid: 'guest-' + Math.random().toString(36).substring(2, 9),
      email: null,
      displayName: 'Guest User',
      isAnonymous: true,
    };
    localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
    setUser(guest);
    setIsDemoMode(true);
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_GUEST_KEY);
    const isNative = typeof window !== 'undefined' && (
      Capacitor.isNativePlatform() ||
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      Boolean((window as any).androidBridge)
    );
    if (isNative) {
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut();
      } catch (e) {
        console.warn('Native sign out error:', e);
      }
    }
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setIsDemoMode(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        signInAnonymously,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthErrorMessage(err: any): string {
  const code = String(err?.code || '');
  const msg = String(err?.message || err || '');

  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email address or password. Please verify and try again.';
  }
  if (code.includes('email-already-in-use')) {
    return 'This email address is already registered. Please sign in instead.';
  }
  if (code.includes('weak-password')) {
    return 'Password should be at least 6 characters long.';
  }
  if (
    code.includes('popup-closed-by-user') ||
    code.includes('canceled') ||
    code.includes('cancelled') ||
    msg.toLowerCase().includes('cancel') ||
    msg.includes('12501')
  ) {
    return 'Google sign-in was cancelled.';
  }
  if (msg.includes('10:') || msg.includes('10 :') || code === '10' || msg.includes('DEVELOPER_ERROR')) {
    return 'Google Error 10 (Developer Error): Please add SHA-1 (43:84:B7:88:53:2B:97:93:22:AF:4B:6D:9C:0F:A6:72:E4:C4:02:07) in Firebase Console under your Android app.';
  }
  if (msg.includes('12500:') || msg.includes('12500 :') || code === '12500' || msg.includes('SIGN_IN_FAILED')) {
    return 'Google Error 12500: Please ensure a Support Email is set in Firebase Project Settings > General, and Google sign-in is enabled.';
  }
  if (msg.includes('7:') || msg.includes('7 :') || code === '7' || msg.toLowerCase().includes('network_error')) {
    return 'Network error during Google sign-in. Please check your internet connection.';
  }
  if (
    code.includes('missing-initial-state') ||
    code.includes('sessionStorage') ||
    msg.toLowerCase().includes('missing initial state') ||
    msg.toLowerCase().includes('sessionstorage')
  ) {
    return 'Google popup sign-in is not supported inside the mobile app. Please sign in or create an account using Email & Password below.';
  }
  return msg || 'Authentication error. Please verify your details.';
}
