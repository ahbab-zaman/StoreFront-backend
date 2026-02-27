import { z } from "zod";

// Helper: form-data sends arrays as JSON strings, so we parse them
const jsonStringToArray = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch {
      return [val]; // single value → wrap in array
    }
  }
  return val;
}, z.array(z.string()).optional());

// ── Product ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDesc: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID"),
  brandId: z.string().uuid("Invalid brand ID").optional(),
  storeId: z.string().uuid("Invalid store ID"),
  mainImage: z.string().optional(), // Set by controller
  images: jsonStringToArray,
  video: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDesc: z.string().max(160).optional(),
  tags: jsonStringToArray,
});

export const updateProductSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  shortDesc: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  mainImage: z.string().optional(),
  images: jsonStringToArray,
  video: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDesc: z.string().max(160).optional(),
  tags: jsonStringToArray,
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
  attributeValueIds: z.preprocess((val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [val];
      }
    }
    return val;
  }, z.array(z.string().uuid()).optional()),
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
