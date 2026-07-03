import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-border bg-surface px-4 text-base text-foreground focus:border-accent-start/50 focus:outline-none focus:ring-2 focus:ring-accent-start/20",
          error && "border-red-400/60 focus:border-red-400 focus:ring-red-400/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
