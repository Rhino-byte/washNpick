import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted focus:border-accent-start/50 focus:outline-none focus:ring-2 focus:ring-accent-start/20",
            error && "border-red-400/60 focus:border-red-400 focus:ring-red-400/20",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      </div>
    );
  },
);
