'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
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
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isAnonymous: firebaseUser.isAnonymous,
        });
        setIsDemoMode(false);
      } else {
        setUser(null);
      }
      setLoading(false);
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
      setIsDemoMode(true);
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    if (!isFirebaseConfigured) {
      const guest: AppUser = {
        uid: 'user_' + btoa(email).slice(0, 8),
        email,
        displayName: email.split('@')[0],
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
      setUser(guest);
      setIsDemoMode(true);
      return;
    }
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signInAnonymously = async () => {
    if (!isFirebaseConfigured) {
      continueAsGuest();
      return;
    }
    await firebaseSignInAnonymously(auth);
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
