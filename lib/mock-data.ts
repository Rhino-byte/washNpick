import type { ServiceId } from "./order-types";
import type { ServiceImageKey } from "./site-images";

export interface ServiceDefinition {
  id: ServiceId;
  name: string;
  description: string;
  turnaround: string;
  priceLabel: string;
  unit: "kg" | "item" | "surcharge";
  pricePerUnit: number;
  imageKey?: ServiceImageKey;
}

export const services: ServiceDefinition[] = [
  {
    id: "wash_fold",
    name: "Wash & Fold",
    description: "Everyday laundry washed, dried, and neatly folded.",
    turnaround: "24–48 hours",
    priceLabel: "KES 50/kg",
    unit: "kg",
    pricePerUnit: 50,
    imageKey: "wash_fold",
  },
  {
    id: "duvet_king_queen",
    name: "Duvet King/Queen",
    description: "King or queen duvet washed and refreshed.",
    turnaround: "24 hours",
    priceLabel: "KES 700/item",
    unit: "item",
    pricePerUnit: 700,
    imageKey: "duvet_king_queen",
  },
  {
    id: "double_duvet",
    name: "Small Double / Standard Double",
    description: "Small double or standard double duvet — same care, one price.",
    turnaround: "24 hours",
    priceLabel: "KES 500/item",
    unit: "item",
    pricePerUnit: 500,
    imageKey: "double_duvet",
  },
];

export const howItWorksSteps = [
  {
    step: 1 as const,
    title: "Book online",
    description: "Schedule a pickup in under 2 minutes from your phone.",
  },
  {
    step: 2 as const,
    title: "We collect",
    description: "Our rider picks up laundry at your chosen time slot.",
  },
  {
    step: 3 as const,
    title: "Clean & deliver",
    description: "Fresh, folded clothes delivered back to your door.",
  },
];

export const trustItems = [
  "Same-day pickup slots",
  "Transparent KES pricing",
  "WhatsApp order updates",
];
