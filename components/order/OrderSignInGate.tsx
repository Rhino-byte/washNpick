"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { DottedSpinner } from "@/components/ui/DottedSpinner";

export function OrderSignInGate() {
  const {
    signIn,
    signInError,
    profileSyncError,
    signInLoading,
    syncingProfile,
    firebaseUser,
  } = useAuth();
  const restoringSession = Boolean(firebaseUser && syncingProfile && !signInLoading);

  return (
    <div className="flex min-h-[60vh] flex-col justify-center px-4 py-8">
      <div className="glass-card rounded-2xl p-6">
        <h1 className="text-xl font-bold text-foreground">Sign in to place your order</h1>
        <p className="mt-2 text-sm text-muted">
          Use your Google account to book pickup, save your details, and track orders.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-accent-start">•</span>
            Pre-filled contact and pickup location
          </li>
          <li className="flex gap-2">
            <span className="text-accent-start">•</span>
            View order history on Track
          </li>
          <li className="flex gap-2">
            <span className="text-accent-start">•</span>
            Faster checkout next time
          </li>
        </ul>

        {(signInError || profileSyncError) && (
          <p className="mt-4 text-sm text-red-300">{signInError ?? profileSyncError}</p>
        )}

        {restoringSession && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <DottedSpinner size="sm" />
            Restoring your session…
          </div>
        )}

        <GoogleSignInButton
          size="lg"
          fullWidth
          className="mt-6"
          loading={signInLoading || restoringSession}
          onClick={() => void signIn()}
        />
      </div>
    </div>
  );
}
