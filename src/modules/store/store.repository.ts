import { prisma } from "../../database/prisma";
import { Prisma, StoreStatus } from "@prisma/client";

// ─── Prisma select — public-safe fields only ─────────────────────────────────
const storePublicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logo: true,
  banner: true,
  status: true,
  isOpen: true,
  deliveryRadiusKm: true,
  minimumOrder: true,
  address: true,
  latitude: true,
  longitude: true,
  openingTime: true,
  closingTime: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StoreSelect;

// ─── Full select (includes sellerId for ownership checks) ────────────────────
const storeFullSelect = {
  ...storePublicSelect,
  sellerId: true,
  deletedAt: true,
} satisfies Prisma.StoreSelect;

export type StoreCreateData = {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  sellerId: string;
  deliveryRadiusKm: number;
  minimumOrder: number;
  address: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
};

export type StoreUpdateData = {
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
};

export class StoreRepository {
  // ── Find ────────────────────────────────────────────────────────────────

  findBySlug(slug: string) {
    return prisma.store.findFirst({
      where: { slug, deletedAt: null },
      select: storePublicSelect,
    });
  }

  findAllBySellerId(sellerId: string) {
    return prisma.store.findMany({
      where: { sellerId, deletedAt: null },
      select: storeFullSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return prisma.store.findFirst({
      where: { id, deletedAt: null },
      select: storeFullSelect,
    });
  }

  findByIdIncludingDeleted(id: string) {
    return prisma.store.findUnique({
      where: { id },
      select: storeFullSelect,
    });
  }

  // ── List ────────────────────────────────────────────────────────────────

  findPublicStores(skip: number, take: number, search?: string) {
    return prisma.store.findMany({
      where: {
        status: StoreStatus.APPROVED,
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
      select: storePublicSelect,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  countPublicStores(search?: string) {
    return prisma.store.count({
      where: {
        status: StoreStatus.APPROVED,
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
    });
  }

  // ── Slug collision ───────────────────────────────────────────────────────

  /** Fetches all existing slugs that start with the base slug */
  findSlugsByBase(baseSlug: string) {
    return prisma.store.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
  }

  // ── Mutate ──────────────────────────────────────────────────────────────

  create(data: StoreCreateData) {
    return prisma.store.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logo: data.logo,
        banner: data.banner,
        sellerId: data.sellerId,
        deliveryRadiusKm: data.deliveryRadiusKm,
        minimumOrder: data.minimumOrder,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        status: StoreStatus.PENDING,
        isOpen: false,
      },
      select: storeFullSelect,
    });
  }

  update(id: string, data: StoreUpdateData) {
    return prisma.store.update({
      where: { id },
      data,
      select: storePublicSelect,
    });
  }

  updateStatus(id: string, status: StoreStatus, isOpen?: boolean) {
    return prisma.store.update({
      where: { id },
      data: {
        status,
        ...(isOpen !== undefined ? { isOpen } : {}),
      },
      select: storePublicSelect,
    });
  }

  softDelete(id: string) {
    return prisma.store.update({
      where: { id },
      data: { deletedAt: new Date(), isOpen: false },
      select: { id: true, name: true, deletedAt: true },
    });
  }

  setOpen(id: string, isOpen: boolean) {
    return prisma.store.update({
      where: { id },
      data: { isOpen },
      select: storePublicSelect,
    });
  }
}
