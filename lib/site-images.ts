import { getCloudinaryUrl } from "./cloudinary/url";

export interface SiteImage {
  publicId: string;
  alt: string;
}

export interface ResolvedSiteImage extends SiteImage {
  src: string;
}

export const siteImages = {
  hero: {
    publicId: "freshfold/hero.jpg",
    alt: "WashnPick rider collecting laundry bags at a doorstep in Ololulunga",
  },
  servicesBanner: {
    publicId: "freshfold/services-banner",
    alt: "Neatly folded fresh laundry",
  },
  aboutHero: {
    publicId: "freshfold/about-hero",
    alt: "WashnPick team preparing laundry for delivery",
  },
  howItWorks: {
    step1: {
      publicId: "freshfold/how-it-works-1",
      alt: "Customer booking laundry pickup on their phone",
    },
    step2: {
      publicId: "freshfold/how-it-works-2",
      alt: "Rider picking up laundry from a customer",
    },
    step3: {
      publicId: "freshfold/how-it-works-3",
      alt: "Clean folded clothes ready for delivery",
    },
  },
  services: {
    wash_fold: {
      publicId: "freshfold/wash-fold",
      alt: "Wash and fold laundry service",
    },
    duvet_king_queen: {
      publicId: "freshfold/ironing",
      alt: "Duvet king or queen laundry service",
    },
    double_duvet: {
      publicId: "freshfold/express",
      alt: "Small double or standard double duvet service",
    },
  },
} as const satisfies Record<string, SiteImage | Record<string, SiteImage>>;

export type ServiceImageKey = keyof typeof siteImages.services;

export function resolveSiteImage(
  image: SiteImage,
  options?: { cacheBust?: string | number },
): ResolvedSiteImage {
  return {
    ...image,
    src: getCloudinaryUrl(image.publicId, { cacheBust: options?.cacheBust }),
  };
}

export function getAllSiteImageSlots(): Array<{
  key: string;
  label: string;
  image: SiteImage;
}> {
  return [
    { key: "hero", label: "Home hero", image: siteImages.hero },
    {
      key: "servicesBanner",
      label: "Services banner",
      image: siteImages.servicesBanner,
    },
    { key: "aboutHero", label: "About hero", image: siteImages.aboutHero },
    {
      key: "howItWorks.step1",
      label: "How it works — Book online",
      image: siteImages.howItWorks.step1,
    },
    {
      key: "howItWorks.step2",
      label: "How it works — We collect",
      image: siteImages.howItWorks.step2,
    },
    {
      key: "howItWorks.step3",
      label: "How it works — Clean & deliver",
      image: siteImages.howItWorks.step3,
    },
    {
      key: "services.wash_fold",
      label: "Wash & Fold",
      image: siteImages.services.wash_fold,
    },
    {
      key: "services.duvet_king_queen",
      label: "Duvet King/Queen",
      image: siteImages.services.duvet_king_queen,
    },
    {
      key: "services.double_duvet",
      label: "Small Double / Standard Double",
      image: siteImages.services.double_duvet,
    },
  ];
}

export const ALLOWED_PUBLIC_IDS = getAllSiteImageSlots().map(
  (slot) => slot.image.publicId,
);

export function isAllowedPublicId(publicId: string): boolean {
  return ALLOWED_PUBLIC_IDS.includes(publicId);
}

export function getServiceImage(serviceId: string): SiteImage | undefined {
  if (serviceId in siteImages.services) {
    return siteImages.services[serviceId as ServiceImageKey];
  }
  return undefined;
}

export function getHowItWorksImage(step: 1 | 2 | 3): SiteImage {
  return siteImages.howItWorks[`step${step}`];
}
