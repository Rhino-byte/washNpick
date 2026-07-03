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
      <Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}>
        <OrderWizard />
      </Suspense>
    </MobileLayout>
  );
}
