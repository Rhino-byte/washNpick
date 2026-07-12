import type { Metadata } from "next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { StaffGate } from "@/components/staff/StaffGate";
import { StaffMessagesDashboard } from "@/components/staff/messages/StaffMessagesDashboard";

export const metadata: Metadata = {
  title: "Staff messages",
  description: "WashnPick WhatsApp messaging admin.",
  robots: { index: false, follow: false },
};

export default function StaffMessagesPage() {
  return (
    <MobileLayout hideFooter hideBottomNav>
      <StaffGate>
        <StaffMessagesDashboard />
      </StaffGate>
    </MobileLayout>
  );
}
