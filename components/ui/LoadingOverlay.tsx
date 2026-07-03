"use client";

import { usePageLoading } from "@/components/providers/PageLoadingProvider";
import { DottedSpinner } from "@/components/ui/DottedSpinner";

export function LoadingOverlay() {
  const { isActive } = usePageLoading();

  if (!isActive) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-md"
      aria-busy="true"
      aria-live="polite"
    >
      <DottedSpinner size="md" />
    </div>
  );
}
