"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDisplayFirstName } from "@/lib/auth-profile";
import { WhatsAppPlaceholder } from "@/components/WhatsAppPlaceholder";

export function UserMenu() {
  const { profile, firebaseUser } = useAuth();

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
      <WhatsAppPlaceholder variant="icon" />
    </div>
  );
}
