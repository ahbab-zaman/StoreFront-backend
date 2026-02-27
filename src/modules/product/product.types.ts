import { ProductStatus } from "@prisma/client";

// ─── Product DTOs ────────────────────────────────────────────────────────────

export interface CreateProductDTO {
  name: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  brandId?: string;
  storeId: string;
  mainImage?: string; // Set by controller from file upload
  images?: string[]; // Set by controller from file upload
  video?: string;
  metaTitle?: string;
  metaDesc?: string;
  tags?: string[];
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  shortDesc?: string;
  categoryId?: string;
  brandId?: string;
  mainImage?: string;
  images?: string[];
  video?: string;
  metaTitle?: string;
  metaDesc?: string;
  tags?: string[];
}

// ─── Variation DTOs ──────────────────────────────────────────────────────────

export interface CreateVariationDTO {
  sku: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isDigital?: boolean;
  image?: string;
  weight?: number;
  dimensions?: string;
  attributeValueIds?: string[];
}

export interface UpdateVariationDTO {
  sku?: string;
  price?: number;
  discountPrice?: number;
  stock?: number;
  isDigital?: boolean;
  image?: string;
  weight?: number;
  dimensions?: string;
}

// ─── Spec DTOs ───────────────────────────────────────────────────────────────

export interface CreateSpecDTO {
  key: string;
  value: string;
}

export interface UpdateSpecDTO {
  key?: string;
  value?: string;
}

// ─── Query DTOs ──────────────────────────────────────────────────────────────

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "oldest" | "price_asc" | "price_desc";
}
