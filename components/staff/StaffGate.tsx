"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { DottedSpinner } from "@/components/ui/DottedSpinner";
import { api } from "@/lib/api";

const showStaffDebug =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_SHOW_STAFF_DEBUG === "true";

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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <DottedSpinner size="lg" />
        <p className="text-sm text-muted">Loading…</p>
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
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <StaffAuthorized
      firebaseUser={firebaseUser}
      onUnauthorizedSignOut={() => void signOut()}
      signOutLoading={signOutLoading}
    >
      {children}
    </StaffAuthorized>
  );
}

function StaffDeveloperSetup({
  email,
  firebaseUid,
}: {
  email: string | null;
  firebaseUid: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(firebaseUid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-dashed border-border bg-surface/80 p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Developer setup</p>
      {email && (
        <p className="mt-2 text-xs text-muted">
          Signed in as <span className="text-foreground">{email}</span>
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Firebase UID</p>
      <p className="mt-1 break-all font-mono text-xs text-foreground">{firebaseUid}</p>
      <Button
        variant="outline"
        size="sm"
        fullWidth
        className="mt-3"
        overlay={false}
        onClick={() => void handleCopy()}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy UID
          </>
        )}
      </Button>
      <p className="mt-3 text-xs text-muted">
        Add this UID to <code className="text-foreground">STAFF_FIREBASE_UIDS</code> in{" "}
        <code className="text-foreground">backend/.env</code> and restart the API.
      </p>
    </div>
  );
}

function StaffAuthorized({
  children,
  firebaseUser,
  onUnauthorizedSignOut,
  signOutLoading,
}: {
  children: ReactNode;
  firebaseUser: { uid: string; email: string | null };
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
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-[60vh] flex-col justify-center px-4 py-8">
        <div className="glass-card rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Access denied</h1>
          <p className="mt-2 text-sm text-muted">
            This area is restricted. If you need access, contact your administrator.
          </p>
          {showStaffDebug && (
            <StaffDeveloperSetup email={firebaseUser.email} firebaseUid={firebaseUser.uid} />
          )}
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
