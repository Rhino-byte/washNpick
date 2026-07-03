import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";

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
      <main className={hideBottomNav ? "flex-1 scroll-pt-14" : "flex-1 scroll-pt-14 pb-20"}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
