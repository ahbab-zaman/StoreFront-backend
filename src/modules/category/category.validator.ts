import { z } from "zod";
import { CategoryStatus } from "@prisma/client";

export const createCategorySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  slug: z.string().optional(),
  status: z.nativeEnum(CategoryStatus).optional(), // Admin can set status on creation
});

export const updateCategorySchema = z.object({
  name: z.string().min(3).optional(),
  icon: z.string().optional(),
});

export const categoryPaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryPaginationInput = z.infer<typeof categoryPaginationSchema>;
