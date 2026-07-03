import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "WashnPick | Laundry Pickup & Delivery in Ololulunga",
    template: "%s | WashnPick",
  },
  description:
    "Book laundry pickup and delivery in Ololulunga. We pick up, we wash, we deliver — wash & fold and duvet care with transparent KES pricing.",
  icons: {
    icon: siteConfig.brand.logoSrc,
    apple: siteConfig.brand.logoSrc,
  },
  openGraph: {
    title: "WashnPick | Laundry Pickup & Delivery in Ololulunga",
    description:
      "We pick up. We wash. We deliver. Book laundry pickup in Ololulunga with transparent KES pricing.",
    type: "website",
    images: [{ url: siteConfig.brand.logoSrc, alt: siteConfig.brand.logoAlt }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WashnPick",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#070b12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} dark h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
