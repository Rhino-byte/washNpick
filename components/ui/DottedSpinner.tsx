import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

interface DottedSpinnerProps {
  size?: keyof typeof sizes;
  className?: string;
  label?: string;
}

export function DottedSpinner({
  size = "md",
  className,
  label = "Loading",
}: DottedSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-accent-start", sizes[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 5"
      />
    </svg>
  );
}
