export const siteConfig = {
  businessName: "WashnPick",
  tagline: "We pick up. We wash. We deliver.",
  heroEyebrow: "Ololulunga's trusted laundry",
  trustHeading: "Why WashnPick?",
  phone: "+254712345678",
  phoneDisplay: "+254 712 345 678",
  email: "hello@washnpick.co.ke",
  whatsappNumber: "", // Set when WhatsApp Business API is ready
  whatsappEnabled: false,
  currency: "KES",
  serviceArea: "Ololulunga",
  hours: "Mon–Sat, 7:00 AM – 8:00 PM",
  address: "Ololulunga, Narok County, Kenya",
  brand: {
    logoSrc: "/brand/washnpick-logo.png",
    logoAlt: "WashnPick — Laundry Pickup. We pick up. We wash. We deliver.",
    logoWidth: 748,
    logoHeight: 503,
  },
} as const;

export function formatPhoneTel(phone: string): string {
  return phone.replace(/\s/g, "");
}
