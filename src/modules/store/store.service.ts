import ApiError from "../../shared/errors/api-error";
import { getPagination } from "../../shared/utils/pagination";
import { StoreRepository } from "./store.repository";
import { StoreStatus } from "@prisma/client";
import type {
  CreateStoreDTO,
  UpdateStoreDTO,
  StoreListQuery,
} from "./store.types";

const storeRepository = new StoreRepository();

// ─── Slug Utilities ──────────────────────────────────────────────────────────

function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = toBaseSlug(name);
  const existing = await storeRepository.findSlugsByBase(base);
  const existingSlugs = new Set(existing.map((s: { slug: string }) => s.slug));

  if (!existingSlugs.has(base)) return base;

  let counter = 1;
  while (existingSlugs.has(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

// ─── Store Service ───────────────────────────────────────────────────────────

export class StoreService {
  // ── 1. Create Store (SELLER only) ─────────────────────────────────────────
  async createStore(sellerId: string, dto: CreateStoreDTO) {
    // Business rule: Multiple stores allowed per seller
    // (Removed one-store-per-seller check)

    const slug = await generateUniqueSlug(dto.name);

    const store = await storeRepository.create({
      ...dto,
      sellerId,
      slug,
    });

    return store;
  }

  // ── 2. Update Store (owner SELLER only) ────────────────────────────────────
  async updateStore(storeId: string, sellerId: string, dto: UpdateStoreDTO) {
    const store = await storeRepository.findById(storeId);

    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // Ownership enforcement
    if (store.sellerId !== sellerId) {
      throw new ApiError(403, "You do not own this store");
    }

    // Suspended stores cannot be updated
    if (store.status === StoreStatus.SUSPENDED) {
      throw new ApiError(403, "Cannot update a suspended store");
    }

    const updated = await storeRepository.update(storeId, dto);
    return updated;
  }

  // ── 3. Get Own Store (SELLER) ──────────────────────────────────────────────
  async getMyStores(sellerId: string) {
    const stores = await storeRepository.findAllBySellerId(sellerId);
    return stores;
  }

  // ── 4. Get Public Stores (CUSTOMER / public) ───────────────────────────────
  async getPublicStores(query: StoreListQuery) {
    const { page, limit, skip, take } = getPagination(query);
    const search = query.search?.trim();

    const [stores, total] = await Promise.all([
      storeRepository.findPublicStores(skip, take, search),
      storeRepository.countPublicStores(search),
    ]);

    return {
      stores,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 5. Get Store by Slug (CUSTOMER / public) ──────────────────────────────
  async getStoreBySlug(slug: string) {
    const store = await storeRepository.findBySlug(slug);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }
    // Never expose PENDING / SUSPENDED / REJECTED stores publicly
    if (store.status !== StoreStatus.APPROVED) {
      throw new ApiError(404, "Store not found");
    }
    return store;
  }

  // ── 6. Admin Approve Store ────────────────────────────────────────────────
  async approveStore(storeId: string) {
    const store = await storeRepository.findByIdIncludingDeleted(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }
    if (store.status !== StoreStatus.PENDING) {
      throw new ApiError(400, "Only PENDING stores can be approved");
    }
    if (store.deletedAt) {
      throw new ApiError(400, "Cannot approve a deleted store");
    }

    return storeRepository.updateStatus(storeId, StoreStatus.APPROVED, true);
  }

  // ── 7. Admin Reject Store ─────────────────────────────────────────────────
  async rejectStore(storeId: string) {
    const store = await storeRepository.findByIdIncludingDeleted(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }
    if (store.status !== StoreStatus.PENDING) {
      throw new ApiError(400, "Only PENDING stores can be rejected");
    }
    if (store.deletedAt) {
      throw new ApiError(400, "Cannot reject a deleted store");
    }

    return storeRepository.updateStatus(storeId, StoreStatus.REJECTED, false);
  }

  // ── 8. Admin Suspend Store ────────────────────────────────────────────────
  async suspendStore(storeId: string) {
    const store = await storeRepository.findByIdIncludingDeleted(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }
    if (store.deletedAt) {
      throw new ApiError(400, "Cannot suspend a deleted store");
    }
    if (store.status === StoreStatus.SUSPENDED) {
      throw new ApiError(400, "Store is already suspended");
    }

    return storeRepository.updateStatus(storeId, StoreStatus.SUSPENDED, false);
  }

  // ── 9. Admin Soft Delete ──────────────────────────────────────────────────
  async softDeleteStore(storeId: string) {
    const store = await storeRepository.findByIdIncludingDeleted(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }
    if (store.deletedAt) {
      throw new ApiError(400, "Store is already deleted");
    }

    return storeRepository.softDelete(storeId);
  }

  // ── 10. Toggle Open/Close (owner SELLER, APPROVED only) ───────────────────
  async toggleOpen(storeId: string, sellerId: string) {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // Ownership enforcement
    if (store.sellerId !== sellerId) {
      throw new ApiError(403, "You do not own this store");
    }

    // Only approved stores can be toggled
    if (store.status !== StoreStatus.APPROVED) {
      throw new ApiError(403, "Only approved stores can be opened or closed");
    }

    return storeRepository.setOpen(storeId, !store.isOpen);
  }
}
