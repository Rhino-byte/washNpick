"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { api, type ApiUserProfile } from "@/lib/api";
import {
  formatFirebaseAuthError,
  getFirebaseAuth,
  getIdToken,
  isFirebaseConfigured,
  signInWithGoogle,
  signOut as firebaseSignOut,
} from "@/lib/firebase";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: ApiUserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInError: string | null;
  signInLoading: boolean;
  signOutLoading: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getToken: () => Promise<string | null>;
  clearSignInError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured());
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const syncProfile = useCallback(async (token: string) => {
    const { user } = await api.syncAuth(token);
    setProfile(user);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setProfile(null);
      return;
    }
    try {
      const user = await api.getMe(token);
      setProfile(user);
    } catch {
      await syncProfile(token);
    }
  }, [syncProfile]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          await syncProfile(token);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsub;
  }, [syncProfile]);

  const clearSignInError = useCallback(() => setSignInError(null), []);

  const signIn = useCallback(async () => {
    setSignInError(null);
    setSignInLoading(true);
    try {
      await signInWithGoogle();
      return true;
    } catch (error) {
      setSignInError(formatFirebaseAuthError(error));
      return false;
    } finally {
      setSignInLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSignOutLoading(true);
    try {
      await firebaseSignOut();
      setProfile(null);
      setSignInError(null);
    } finally {
      setSignOutLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      isConfigured: isFirebaseConfigured(),
      signInError,
      signInLoading,
      signOutLoading,
      signIn,
      signOut,
      refreshProfile,
      getToken: getIdToken,
      clearSignInError,
    }),
    [
      firebaseUser,
      profile,
      loading,
      signInError,
      signInLoading,
      signOutLoading,
      signIn,
      signOut,
      refreshProfile,
      clearSignInError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
