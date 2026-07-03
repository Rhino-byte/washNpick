import Link from "next/link";
import { formatKES } from "@/lib/format";

export function PricingTeaser() {
  return (
    <section className="px-4 py-8 pb-6">
      <div className="gradient-border-card rounded-2xl p-5 text-center">
        <p className="text-sm font-medium text-muted">Starting from</p>
        <p className="mt-1 text-3xl font-bold text-gradient">{formatKES(50)}/kg</p>
        <p className="mt-2 text-sm text-muted">
          Final price confirmed after weighing your laundry
        </p>
        <Link
          href="/services"
          className="mt-4 inline-block text-sm font-semibold text-accent-start hover:underline"
        >
          See full pricing
        </Link>
      </div>
    </section>
  );
}
