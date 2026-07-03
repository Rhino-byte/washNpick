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
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-start/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
