import { howItWorksSteps } from "@/lib/mock-data";
import { getHowItWorksImage } from "@/lib/site-images";
import { ImageSlot } from "@/components/ui/ImageSlot";

export function HowItWorks() {
  return (
    <section className="px-4 py-8">
      <h2 className="text-xl font-bold text-foreground">How it works</h2>
      <div className="mt-4 space-y-4">
        {howItWorksSteps.map(({ step, title, description }) => (
          <div key={step} className="glass-card overflow-hidden rounded-2xl">
            <ImageSlot
              image={getHowItWorksImage(step)}
              aspect="video"
              rounded="none"
            />
            <div className="flex gap-4 p-4">
              <div className="step-active flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                {step}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
