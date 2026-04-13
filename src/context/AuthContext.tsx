'use client';

import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { auth, db } from '@/lib/firebase';

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

type FirebaseAuthErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  customData?: Record<string, unknown>;
};

function formatAuthError(action: string, error: unknown, email?: string) {
  const authError = error as FirebaseAuthErrorLike;
  const code = authError?.code ?? 'unknown';
  const message = authError?.message ?? 'Authentication request failed.';

  let hint = 'Check your Firebase project configuration and retry.';

  if (code === 'auth/operation-not-allowed') {
    hint = 'Enable Email/Password authentication in the Firebase console under Authentication > Sign-in method.';
  } else if (code === 'auth/user-not-found') {
    hint = 'No account exists for that email address.';
  } else if (code === 'auth/wrong-password') {
    hint = 'The password is incorrect for that account.';
  } else if (code === 'auth/email-already-in-use') {
    hint = 'That email is already registered. Try signing in instead.';
  } else if (code === 'auth/invalid-credential') {
    hint = 'The provided credentials were rejected by Firebase.';
  }

  const detailLines = [
    `Action: ${action}`,
    `Code: ${code}`,
    `Message: ${message}`,
    email ? `Email: ${email}` : undefined,
    `Hint: ${hint}`
  ].filter(Boolean);

  console.error('[FirebaseAuth]', {
    action,
    code,
    message,
    email,
    hint,
    error
  });

  return detailLines.join('\n');
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => undefined);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      currentUser,
      loading,
      signIn: async (email: string, password: string) => {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (error) {
          throw new Error(formatAuthError('signIn', error, email.trim()));
        }
      },
      signUp: async (email: string, password: string) => {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

          await setDoc(
            doc(db, 'users', credential.user.uid),
            {
              uid: credential.user.uid,
              email: credential.user.email ?? email.trim(),
              createdAt: serverTimestamp()
            },
            { merge: true }
          );
        } catch (error) {
          throw new Error(formatAuthError('signUp', error, email.trim()));
        }
      },
      logOut: async () => {
        await signOut(auth);
      }
    };
  }, [currentUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}