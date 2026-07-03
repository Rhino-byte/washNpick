import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  className,
  children,
  required,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-foreground/90", className)}
      {...props}
    >
      {children}
      {required && <span className="text-accent-start"> *</span>}
    </label>
  );
}
