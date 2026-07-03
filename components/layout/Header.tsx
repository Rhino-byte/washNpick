"use client";

import Link from "next/link";
import { Phone, LogIn, LogOut } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { siteConfig, formatPhoneTel } from "@/lib/site-config";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function Header() {
  const { profile, isConfigured, signIn, signOut, loading } = useAuth();

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
              <button
                type="button"
                onClick={() => signOut()}
                className="flex h-10 items-center gap-1 rounded-full border border-border px-3 text-xs text-muted hover:bg-surface"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => signIn()}>
                <LogIn className="h-4 w-4" />
              </Button>
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
    </header>
  );
}
