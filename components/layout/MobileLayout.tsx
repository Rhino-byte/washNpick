import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

interface MobileLayoutProps {
  children: React.ReactNode;
  hideBottomNav?: boolean;
  hideFooter?: boolean;
}

export function MobileLayout({
  children,
  hideBottomNav = false,
  hideFooter = false,
}: MobileLayoutProps) {
  return (
    <div className="app-shell mx-auto flex min-h-screen w-full max-w-[480px] flex-col">
      <Header />
      <main
        className={
          hideBottomNav
            ? "relative flex-1 scroll-pt-14"
            : "relative flex-1 scroll-pt-14 pb-20"
        }
      >
        {children}
        <LoadingOverlay />
      </main>
      {!hideFooter && <Footer />}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
