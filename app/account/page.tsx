"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { AccountProfileHeader } from "@/components/account/AccountProfileHeader";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";
import { AccountAddresses } from "@/components/account/AccountAddresses";
import { Button } from "@/components/ui/button";
import { DottedSpinner } from "@/components/ui/DottedSpinner";

export default function AccountPage() {
  const {
    profile,
    firebaseUser,
    syncingProfile,
    isConfigured,
    signIn,
    signInError,
    profileSyncError,
    signInLoading,
    signOut,
    signOutLoading,
  } = useAuth();

  if (isConfigured && !profile) {
    return (
      <MobileLayout hideFooter>
        <div className="px-4 py-8">
          <h1 className="text-xl font-bold text-foreground">Your account</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to manage your profile and saved addresses.
          </p>
          {(signInError || profileSyncError) && (
            <p className="mt-4 text-sm text-red-300">{signInError ?? profileSyncError}</p>
          )}
          {firebaseUser && syncingProfile && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
              <DottedSpinner size="sm" />
              Restoring your session…
            </div>
          )}
          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="mt-6"
            loading={signInLoading || (Boolean(firebaseUser) && syncingProfile)}
            loadingText="Sign in with Google"
            overlay={false}
            onClick={() => void signIn()}
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </Button>
          <Link
            href="/order"
            className="mt-4 block text-center text-sm text-accent-start hover:underline"
          >
            Place an order
          </Link>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideFooter>
      <div className="space-y-6 px-4 py-6 pb-24">
        <AccountProfileHeader />
        <AccountProfileForm />
        <AccountAddresses />
        <div className="space-y-3">
          <Link
            href="/track"
            className="block text-center text-sm text-accent-start hover:underline"
          >
            View your orders
          </Link>
          <Button
            variant="outline"
            size="md"
            fullWidth
            loading={signOutLoading}
            loadingText="Signing out"
            overlay={false}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
