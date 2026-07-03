import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { OrderWizard } from "@/components/order/OrderWizard";

export const metadata: Metadata = {
  title: "Place Order",
  description: "Schedule a laundry pickup in Ololulunga.",
};

export default function OrderPage() {
  return (
    <MobileLayout hideFooter>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-start border-t-transparent" />
          </div>
        }
      >
        <OrderWizard />
      </Suspense>
    </MobileLayout>
  );
}
