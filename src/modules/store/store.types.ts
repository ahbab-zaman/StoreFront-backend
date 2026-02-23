import { StoreStatus } from "@prisma/client";

// ─── Create DTO ─────────────────────────────────────────────────────────────
export interface CreateStoreDTO {
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  deliveryRadiusKm: number;
  minimumOrder: number;
  address: string;
  latitude: number;
  longitude: number;
  openingTime: string; // HH:mm
  closingTime: string; // HH:mm
}

// ─── Update DTO ──────────────────────────────────────────────────────────────
export interface UpdateStoreDTO {
  name?: string;
  description?: string;
  logo?: string;
  banner?: string;
  deliveryRadiusKm?: number;
  minimumOrder?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  openingTime?: string;
  closingTime?: string;
}

// ─── Query DTO ───────────────────────────────────────────────────────────────
export interface StoreListQuery {
  page?: string;
  limit?: string;
  search?: string;
}

// ─── Safe Public View (never return raw Prisma object) ───────────────────────
export interface StorePublicView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  status: StoreStatus;
  isOpen: boolean;
  deliveryRadiusKm: number;
  minimumOrder: number;
  address: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  createdAt: Date;
}

// ─── Pagination Meta ─────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedStores {
  stores: StorePublicView[];
  meta: PaginationMeta;
}
