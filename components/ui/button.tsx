"use client";

import { useEffect, useId } from "react";
import { usePageLoading } from "@/components/providers/PageLoadingProvider";
import { DottedSpinner } from "@/components/ui/DottedSpinner";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "gradient-primary-btn text-white hover:brightness-110 active:brightness-95 disabled:opacity-40",
  secondary:
    "glass-card text-foreground hover:bg-surface-elevated active:bg-white/10",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-surface active:bg-surface-elevated",
  ghost: "text-accent-start hover:bg-surface active:bg-surface-elevated",
  accent:
    "gradient-cta text-white transition-all disabled:opacity-40",
};

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-base font-semibold",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  /** When false, only the inline spinner shows — no page blur overlay. */
  overlay?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  loading = false,
  loadingText,
  overlay = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { setOverlayActive } = usePageLoading();
  const overlayId = useId();

  useEffect(() => {
    if (!loading || !overlay) return;
    setOverlayActive(overlayId, true);
    return () => setOverlayActive(overlayId, false);
  }, [loading, overlay, overlayId, setOverlayActive]);

  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-start/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <DottedSpinner size="sm" className="shrink-0" />
          {(loadingText !== undefined ? loadingText : children) ? (
            <span>{loadingText !== undefined ? loadingText : children}</span>
          ) : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
