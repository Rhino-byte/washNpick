import { z } from "zod";
import {
  getAvailableTimeSlots,
  isPickupSlotAvailable,
  pickupSlotUnavailableMessage,
} from "@/lib/pickup-scheduling";

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => {
    const digits = val.replace(/\D/g, "");
    const normalized = digits.startsWith("254")
      ? digits
      : digits.startsWith("0")
        ? `254${digits.slice(1)}`
        : digits.length === 9
          ? `254${digits}`
          : digits;
    return /^254[17]\d{8}$/.test(normalized);
  }, "Enter a valid Kenyan phone number (+254 7XX XXX XXX)");

export const contactStepSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: phoneSchema,
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    landmark: z.string().optional(),
    formattedAddress: z.string().optional(),
    area: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.latitude == null || data.longitude == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set your pickup location using the map",
        path: ["latitude"],
      });
    }
  });

export const servicesStepSchema = z.object({
  services: z
    .array(
      z.object({
        serviceId: z.enum(["wash_fold", "duvet_king_queen", "double_duvet"]),
        quantity: z.number().min(1),
      }),
    )
    .min(1, "Select at least one service"),
  estimatedWeightKg: z.number().min(1, "Minimum 1 kg").max(50, "Maximum 50 kg"),
  specialInstructions: z.string(),
});

export const scheduleStepSchema = z
  .object({
    pickupDate: z.string().min(1, "Select a pickup date"),
    pickupTimeSlot: z.enum(["morning", "afternoon", "evening"]),
    sameDeliveryAddress: z.boolean(),
    deliveryLatitude: z.number().nullable(),
    deliveryLongitude: z.number().nullable(),
    deliveryLandmark: z.string().optional(),
    deliveryDate: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.sameDeliveryAddress) {
      if (data.deliveryLatitude == null || data.deliveryLongitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set your delivery location on the map",
          path: ["deliveryLatitude"],
        });
      }
    }
    if (!isPickupSlotAvailable(data.pickupDate, data.pickupTimeSlot)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: pickupSlotUnavailableMessage(data.pickupDate, data.pickupTimeSlot),
        path: ["pickupTimeSlot"],
      });
    }
    const available = getAvailableTimeSlots(data.pickupDate);
    if (available.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No pickup slots left for this date. Choose another date.",
        path: ["pickupDate"],
      });
    }
  });

export type ContactStepValues = z.infer<typeof contactStepSchema>;
export type ServicesStepValues = z.infer<typeof servicesStepSchema>;
export type ScheduleStepValues = z.infer<typeof scheduleStepSchema>;
export type OrderFormValues = ContactStepValues & ServicesStepValues & ScheduleStepValues;
