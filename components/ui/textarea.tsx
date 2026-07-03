import { cn } from "@/lib/utils";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      <textarea
        className={cn(
          "min-h-24 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent-start/50 focus:outline-none focus:ring-2 focus:ring-accent-start/20",
          error && "border-red-400/60 focus:border-red-400 focus:ring-red-400/20",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
