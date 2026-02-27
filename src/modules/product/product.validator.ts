import { z } from "zod";

// ── Product ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDesc: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID"),
  brandId: z.string().uuid("Invalid brand ID").optional(),
  storeId: z.string().uuid("Invalid store ID"),
  mainImage: z.string().optional(), // Set by controller
  images: z.array(z.string()).optional(),
  video: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDesc: z.string().max(160).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  shortDesc: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  mainImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  video: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDesc: z.string().max(160).optional(),
  tags: z.array(z.string()).optional(),
});

// ── Variation ────────────────────────────────────────────────────────────────

export const createVariationSchema = z.object({
  sku: z.string().min(3, "SKU must be at least 3 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  discountPrice: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  isDigital: z.coerce.boolean().optional().default(false),
  image: z.string().optional(),
  weight: z.coerce.number().positive().optional(),
  dimensions: z.string().optional(),
  attributeValueIds: z.array(z.string().uuid()).optional(),
});

export const updateVariationSchema = z.object({
  sku: z.string().min(3).optional(),
  price: z.coerce.number().positive().optional(),
  discountPrice: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  isDigital: z.coerce.boolean().optional(),
  image: z.string().optional(),
  weight: z.coerce.number().positive().optional(),
  dimensions: z.string().optional(),
});

// ── Specification ────────────────────────────────────────────────────────────

export const createSpecSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

export const updateSpecSchema = z.object({
  key: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
});

// ── Pagination / Filters ─────────────────────────────────────────────────────

export const productPaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(["newest", "oldest", "price_asc", "price_desc"]).optional(),
});
