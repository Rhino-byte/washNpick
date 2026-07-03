"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shirt, ShoppingBag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/services", label: "Services", icon: Shirt },
  { href: "/order", label: "Order", icon: ShoppingBag },
  { href: "/track", label: "Track", icon: MapPin },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-[100] border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-[480px] items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all",
                active
                  ? "text-accent-start"
                  : "text-muted hover:text-foreground/70",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  active && "bg-accent-start/10",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              </div>
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
