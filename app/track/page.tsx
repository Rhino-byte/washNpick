import type { Metadata } from "next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { TrackPageContent } from "@/components/track/TrackPageContent";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track your laundry order status in Ololulunga.",
};

export default function TrackPage() {
  return (
    <MobileLayout hideFooter>
      <TrackPageContent />
    </MobileLayout>
  );
}
