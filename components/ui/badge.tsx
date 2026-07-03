import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "muted";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" &&
          "border border-accent-start/30 bg-accent-start/10 text-accent-start",
        variant === "accent" &&
          "border border-accent-end/30 bg-accent-end/10 text-accent-end",
        variant === "muted" && "border border-border bg-surface text-muted",
        className,
      )}
      {...props}
    />
  );
}
