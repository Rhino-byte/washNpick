"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { DottedSpinner } from "@/components/ui/DottedSpinner";
import { api } from "@/lib/api";

interface StaffGateProps {
  children: ReactNode;
}

export function StaffGate({ children }: StaffGateProps) {
  const {
    firebaseUser,
    loading: authLoading,
    syncingProfile,
    isConfigured,
    signIn,
    signInError,
    signInLoading,
    signOut,
    signOutLoading,
  } = useAuth();

  if (!isConfigured) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted">
        Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <DottedSpinner size="lg" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="flex min-h-[60vh] flex-col justify-center px-4 py-8">
        <div className="glass-card rounded-2xl p-6">
          <h1 className="text-xl font-bold text-foreground">Staff sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with your authorized Google account to manage orders.
          </p>
          {signInError && <p className="mt-4 text-sm text-red-300">{signInError}</p>}
          <GoogleSignInButton
            size="lg"
            fullWidth
            className="mt-6"
            loading={signInLoading}
            onClick={() => void signIn()}
          />
        </div>
      </div>
    );
  }

  if (syncingProfile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <DottedSpinner size="lg" />
        <p className="text-sm text-muted">Checking staff access…</p>
      </div>
    );
  }

  return (
    <StaffAuthorized onUnauthorizedSignOut={() => void signOut()} signOutLoading={signOutLoading}>
      {children}
    </StaffAuthorized>
  );
}

function StaffAuthorized({
  children,
  onUnauthorizedSignOut,
  signOutLoading,
}: {
  children: ReactNode;
  onUnauthorizedSignOut: () => void;
  signOutLoading: boolean;
}) {
  const { getToken } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setState("denied");
          return;
        }
        await api.getStaffMe(token);
        if (!cancelled) setState("ok");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <DottedSpinner size="lg" />
        <p className="text-sm text-muted">Verifying staff access…</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-[60vh] flex-col justify-center px-4 py-8">
        <div className="glass-card rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Not authorized</h1>
          <p className="mt-2 text-sm text-muted">
            Your account is not on the staff allowlist. Ask an admin to add your Firebase UID to{" "}
            <code className="text-xs">STAFF_FIREBASE_UIDS</code>.
          </p>
          <Button
            variant="outline"
            size="md"
            fullWidth
            className="mt-6"
            loading={signOutLoading}
            loadingText="Signing out"
            overlay={false}
            onClick={onUnauthorizedSignOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
