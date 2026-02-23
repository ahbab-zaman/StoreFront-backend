import { z } from "zod";

// HH:mm format — allows H:mm or HH:mm, 0:00 to 23:59
const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

const timeSchema = z
  .string()
  .regex(timeRegex, "Time must be in HH:mm format (e.g., 08:00 or 8:00)")
  .transform((val) =>
    val.includes(":") && val.split(":")[0].length === 1 ? "0" + val : val,
  );

// ─── Create Store Schema ───────────────────────────────────────────────────
export const createStoreSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name must not exceed 100 characters"),

    description: z
      .string()
      .max(500, "Description must not exceed 500 characters")
      .optional(),

    logo: z.string().optional(),
    banner: z.string().optional(),

    deliveryRadiusKm: z.coerce
      .number({ message: "Delivery radius is required" })
      .positive("Delivery radius must be greater than 0"),

    minimumOrder: z.coerce
      .number({ message: "Minimum order is required" })
      .min(0, "Minimum order cannot be negative"),

    address: z.string().min(5, "Address must be at least 5 characters"),

    latitude: z.coerce
      .number({ message: "Latitude is required" })
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),

    longitude: z.coerce
      .number({ message: "Longitude is required" })
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),

    openingTime: z
      .string()
      .regex(timeRegex, "Opening time must be in HH:mm format"),

    closingTime: z
      .string()
      .regex(timeRegex, "Closing time must be in HH:mm format"),
  })
  .refine((d) => d.openingTime < d.closingTime, {
    message: "Opening time must be before closing time",
    path: ["openingTime"],
  });

// ─── Update Store Schema ───────────────────────────────────────────────────
export const updateStoreSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name must not exceed 100 characters")
      .optional(),

    description: z
      .string()
      .max(500, "Description must not exceed 500 characters")
      .optional(),

    logo: z.string().optional(),
    banner: z.string().optional(),

    deliveryRadiusKm: z.coerce
      .number()
      .positive("Delivery radius must be greater than 0")
      .optional(),

    minimumOrder: z.coerce
      .number()
      .min(0, "Minimum order cannot be negative")
      .optional(),

    address: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .optional(),

    latitude: z.coerce
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .optional(),

    longitude: z.coerce
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .optional(),

    openingTime: z
      .string()
      .regex(timeRegex, "Opening time must be in HH:mm format")
      .optional(),

    closingTime: z
      .string()
      .regex(timeRegex, "Closing time must be in HH:mm format")
      .optional(),
  })
  .refine(
    (d) => !d.openingTime || !d.closingTime || d.openingTime < d.closingTime,
    {
      message: "Opening time must be before closing time",
      path: ["openingTime"],
    },
  );

// ─── Store List Query Schema ───────────────────────────────────────────────
export const storeListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

// ─── Inferred Types ────────────────────────────────────────────────────────
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type StoreListQueryInput = z.infer<typeof storeListQuerySchema>;
