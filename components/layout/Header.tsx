"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { UserMenu } from "./UserMenu";
import { siteConfig, formatPhoneTel } from "@/lib/site-config";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function Header() {
  const { profile, isConfigured, signIn, loading, signInError, signInLoading } =
    useAuth();

  return (
    <header className="sticky top-0 z-[90] border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center"
          aria-label={siteConfig.businessName}
        >
          <BrandLogo height={44} priority />
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {isConfigured && !loading && (
            profile ? (
              <UserMenu />
            ) : (
              <GoogleSignInButton
                size="sm"
                compact
                loading={signInLoading}
                onClick={() => void signIn()}
              />
            )
          )}
          <a
            href={`tel:${formatPhoneTel(siteConfig.phone)}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent-start transition-colors hover:bg-surface-elevated active:bg-white/10"
            aria-label="Call us"
          >
            <Phone className="h-5 w-5" />
          </a>
        </div>
      </div>
      {signInError && (
        <p className="border-t border-red-400/30 bg-red-400/10 px-4 py-2 text-xs text-red-200">
          {signInError}
        </p>
      )}
    </header>
  );
}
