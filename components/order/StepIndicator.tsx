import { cn } from "@/lib/utils";

const steps = ["Contact", "Services", "Schedule", "Review"];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const active = stepNum === currentStep;
          const completed = stepNum < currentStep;

          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      completed || active
                        ? "bg-gradient-to-r from-accent-start to-accent-mid"
                        : "bg-border",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    active && "step-active text-white",
                    completed && !active && "step-complete",
                    !active && !completed && "bg-surface text-muted",
                  )}
                >
                  {stepNum}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      completed
                        ? "bg-gradient-to-r from-accent-mid to-accent-end"
                        : "bg-border",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] font-medium",
                  active ? "text-accent-start" : "text-muted",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
