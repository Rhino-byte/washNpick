"use client";

import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDisplayFirstName, getInitials } from "@/lib/auth-profile";

export function AccountProfileHeader() {
  const { profile, firebaseUser } = useAuth();

  if (!profile) return null;

  const photoUrl = firebaseUser?.photoURL;
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    getDisplayFirstName(profile, firebaseUser);

  return (
    <div className="flex items-center gap-4">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-accent-start/30"
          unoptimized
        />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-start/20 text-lg font-semibold text-accent-start ring-2 ring-accent-start/30">
          {getInitials(profile, firebaseUser)}
        </span>
      )}
      <div>
        <h1 className="text-xl font-bold text-foreground">{name || "Your account"}</h1>
        <p className="text-sm text-muted">{profile.email}</p>
      </div>
    </div>
  );
}
