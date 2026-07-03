"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDisplayFirstName } from "@/lib/auth-profile";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { profile, firebaseUser, signOut, signOutLoading } = useAuth();

  if (!profile) return null;

  const firstName = getDisplayFirstName(profile, firebaseUser);

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="flex h-11 max-w-[160px] items-center rounded-full border border-border bg-surface px-4 transition-colors hover:bg-surface-elevated"
        aria-label="Account"
      >
        <span className="truncate text-sm font-semibold text-foreground">
          {firstName || "Account"}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="md"
        loading={signOutLoading}
        loadingText=""
        overlay={false}
        onClick={() => void signOut()}
        className="h-11 w-11 shrink-0 rounded-full border border-border p-0 text-foreground hover:bg-surface-elevated"
        aria-label="Sign out"
      >
        <LogOut className="h-6 w-6" strokeWidth={2.25} />
      </Button>
    </div>
  );
}
