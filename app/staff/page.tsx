import type { Metadata } from "next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { StaffGate } from "@/components/staff/StaffGate";
import { StaffDashboard } from "@/components/staff/StaffDashboard";

export const metadata: Metadata = {
  title: "Staff",
  description: "WashnPick support staff order dashboard.",
  robots: { index: false, follow: false },
};

export default function StaffPage() {
  return (
    <MobileLayout hideFooter hideBottomNav>
      <StaffGate>
        <StaffDashboard />
      </StaffGate>
    </MobileLayout>
  );
}
