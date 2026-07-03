"use client";

import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDisplayFirstName } from "@/lib/auth-profile";

export function AuthWelcomeBanner() {
  const { profile, firebaseUser, isNewUser } = useAuth();

  if (!profile) return null;

  const firstName = getDisplayFirstName(profile, firebaseUser);

  let message: string;
  if (isNewUser) {
    message = "Welcome! Complete your phone and pickup location to continue.";
  } else if (profile.profile_complete) {
    message = firstName
      ? `Welcome back, ${firstName}! Your saved pickup location is ready.`
      : "Welcome back! Your saved pickup location is ready.";
  } else {
    message = firstName
      ? `Welcome back, ${firstName} — add your phone to continue.`
      : "Welcome back — add your phone to continue.";
  }

  return (
    <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-accent-start/30 bg-accent-start/10 p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-start" />
      <p className="text-sm text-foreground/90">{message}</p>
    </div>
  );
}
