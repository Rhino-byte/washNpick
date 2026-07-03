"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { api, ApiError, type ApiUserProfile } from "@/lib/api";
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
  syncingProfile: boolean;
  isNewUser: boolean;
  isConfigured: boolean;
  signInError: string | null;
  profileSyncError: string | null;
  signInLoading: boolean;
  signOutLoading: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getToken: () => Promise<string | null>;
  clearSignInError: () => void;
  clearProfileSyncError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured());
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const profileSyncRef = useRef<Promise<void> | null>(null);

  const syncProfile = useCallback(async (token: string) => {
    const { user, is_new } = await api.syncAuth(token);
    setProfile(user);
    setIsNewUser(is_new);
  }, []);

  const runProfileSync = useCallback(
    async (token: string) => {
      if (profileSyncRef.current) {
        await profileSyncRef.current;
        return;
      }

      const task = syncProfile(token).finally(() => {
        profileSyncRef.current = null;
      });
      profileSyncRef.current = task;
      await task;
    },
    [syncProfile],
  );

  const refreshProfile = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setProfile(null);
      setIsNewUser(false);
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
      setLoading(false);

      if (user) {
        setSyncingProfile(true);
        setProfileSyncError(null);
        try {
          const token = await user.getIdToken();
          await runProfileSync(token);
        } catch (error) {
          setProfile(null);
          setIsNewUser(false);
          const message =
            error instanceof ApiError
              ? error.message
              : "Could not load your account. Try signing in again.";
          setProfileSyncError(message);
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            await firebaseSignOut();
            setFirebaseUser(null);
          }
        } finally {
          setSyncingProfile(false);
        }
      } else {
        setProfile(null);
        setIsNewUser(false);
        setProfileSyncError(null);
      }
    });

    return unsub;
  }, [runProfileSync]);

  const clearSignInError = useCallback(() => setSignInError(null), []);
  const clearProfileSyncError = useCallback(() => setProfileSyncError(null), []);

  const signIn = useCallback(async () => {
    setSignInError(null);
    setProfileSyncError(null);
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
      setIsNewUser(false);
      setSignInError(null);
      setProfileSyncError(null);
    } finally {
      setSignOutLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      syncingProfile,
      isNewUser,
      isConfigured: isFirebaseConfigured(),
      signInError,
      profileSyncError,
      signInLoading,
      signOutLoading,
      signIn,
      signOut,
      refreshProfile,
      getToken: getIdToken,
      clearSignInError,
      clearProfileSyncError,
    }),
    [
      firebaseUser,
      profile,
      loading,
      syncingProfile,
      isNewUser,
      signInError,
      profileSyncError,
      signInLoading,
      signOutLoading,
      signIn,
      signOut,
      refreshProfile,
      clearSignInError,
      clearProfileSyncError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
