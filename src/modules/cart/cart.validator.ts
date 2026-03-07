import { z } from "zod";

// ─── Add Item Schema ──────────────────────────────────────────────────────────
export const AddCartItemSchema = z.object({
  variationId: z.string().uuid("Invalid variation ID"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(100, "Quantity cannot exceed 100"),
});

// ─── Update Item Quantity Schema ──────────────────────────────────────────────
export const UpdateCartItemSchema = z.object({
  // 0 is allowed → triggers deletion in the service layer
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative")
    .max(100, "Quantity cannot exceed 100"),
});

// ─── Merge Guest Cart Schema ──────────────────────────────────────────────────
export const MergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        variationId: z.string().uuid("Invalid variation ID"),
        quantity: z
          .number()
          .int("Quantity must be a whole number")
          .min(1, "Quantity must be at least 1")
          .max(100, "Quantity cannot exceed 100"),
      }),
    )
    .min(1, "Items array must not be empty")
    .max(50, "Cannot merge more than 50 items at once"),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type AddCartItemDTO = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemDTO = z.infer<typeof UpdateCartItemSchema>;
export type MergeCartDTO = z.infer<typeof MergeCartSchema>;
