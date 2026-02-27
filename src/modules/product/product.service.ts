import ApiError from "../../shared/errors/api-error";
import { getPagination } from "../../shared/utils/pagination";
import { ProductRepository } from "./product.repository";
import {
  CategoryStatus,
  ProductStatus,
  StoreStatus,
  Prisma,
} from "@prisma/client";
import type {
  CreateProductDTO,
  UpdateProductDTO,
  CreateVariationDTO,
  UpdateVariationDTO,
  CreateSpecDTO,
  UpdateSpecDTO,
  ProductQuery,
} from "./product.types";

const productRepository = new ProductRepository();

// ─── Slug Utilities (Same pattern as Store / Category) ───────────────────────

function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = toBaseSlug(name);
  const existing = await productRepository.findSlugsByBase(base);
  const existingSlugs = new Set(existing.map((s: { slug: string }) => s.slug));

  if (!existingSlugs.has(base)) return base;

  let counter = 1;
  while (existingSlugs.has(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

// ─── Sort Mapping ────────────────────────────────────────────────────────────

function getSortOrder(sortBy?: string): Prisma.ProductOrderByWithRelationInput {
  switch (sortBy) {
    case "oldest":
      return { createdAt: "asc" };
    case "price_asc":
      return { variations: { _count: "asc" } };
    case "price_desc":
      return { variations: { _count: "desc" } };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

// ─── Product Service ─────────────────────────────────────────────────────────

export class ProductService {
  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC
  // ══════════════════════════════════════════════════════════════════════════

  async getPublicProducts(query: ProductQuery) {
    const { page, limit, skip, take } = getPagination(query);
    const orderBy = getSortOrder(query.sortBy);

    const [products, total] = await Promise.all([
      productRepository.findPublicProducts(skip, take, query, orderBy),
      productRepository.countPublicProducts(query),
    ]);

    return {
      products,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProductBySlug(slug: string) {
    const product = await productRepository.findBySlugPublic(slug);
    if (!product) throw new ApiError(404, "Product not found");
    return product;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SELLER — Products
  // ══════════════════════════════════════════════════════════════════════════

  async getSellerProducts(sellerId: string, query: ProductQuery) {
    const stores = await productRepository.findStoresByOwner(sellerId);
    const storeIds = stores.map((s) => s.id);

    if (storeIds.length === 0) {
      return {
        products: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    const { page, limit, skip, take } = getPagination(query);
    const search = query.search?.trim();

    const [products, total] = await Promise.all([
      productRepository.findSellerProducts(storeIds, skip, take, search),
      productRepository.countSellerProducts(storeIds, search),
    ]);

    return {
      products,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSellerProductById(sellerId: string, productId: string) {
    const product = await productRepository.findByIdWithStore(productId);
    if (!product) throw new ApiError(404, "Product not found");

    await this.enforceOwnership(product.store.sellerId, sellerId);

    return product;
  }

  async createProduct(sellerId: string, dto: CreateProductDTO) {
    // 1. Verify store ownership
    const stores = await productRepository.findStoresByOwner(sellerId);
    const ownedStore = stores.find((s) => s.id === dto.storeId);

    if (!ownedStore) {
      throw new ApiError(403, "You do not own this store");
    }

    // 2. Store must be APPROVED
    if (ownedStore.status !== StoreStatus.APPROVED) {
      throw new ApiError(403, "Store must be approved before adding products");
    }

    // 3. Category must exist and be APPROVED
    await this.validateCategoryExists(dto.categoryId);

    // 4. Brand must exist if provided
    if (dto.brandId) {
      await this.validateBrandExists(dto.brandId);
    }

    // 5. Generate unique slug
    const slug = await generateUniqueSlug(dto.name);

    return productRepository.create({ ...dto, slug });
  }

  async updateProduct(
    sellerId: string,
    productId: string,
    dto: UpdateProductDTO,
  ) {
    const product = await productRepository.findByIdWithStore(productId);
    if (!product) throw new ApiError(404, "Product not found");

    await this.enforceOwnership(product.store.sellerId, sellerId);

    // Validate category if changing
    if (dto.categoryId) await this.validateCategoryExists(dto.categoryId);

    // Validate brand if changing
    if (dto.brandId) await this.validateBrandExists(dto.brandId);

    return productRepository.update(productId, dto);
  }

  async submitProductForReview(sellerId: string, productId: string) {
    const product = await productRepository.findByIdWithStore(productId);
    if (!product) throw new ApiError(404, "Product not found");

    await this.enforceOwnership(product.store.sellerId, sellerId);

    if (product.status !== ProductStatus.DRAFT) {
      throw new ApiError(
        400,
        "Only DRAFT products can be submitted for review",
      );
    }

    return productRepository.updateStatus(productId, ProductStatus.PENDING);
  }

  async softDeleteProduct(sellerId: string, productId: string) {
    const product = await productRepository.findByIdWithStore(productId);
    if (!product) throw new ApiError(404, "Product not found");

    await this.enforceOwnership(product.store.sellerId, sellerId);

    return productRepository.softDelete(productId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SELLER — Variations
  // ══════════════════════════════════════════════════════════════════════════

  async addVariation(
    sellerId: string,
    productId: string,
    dto: CreateVariationDTO,
  ) {
    const product = await productRepository.findByIdWithStore(productId);
    if (!product) throw new ApiError(404, "Product not found");

    await this.enforceOwnership(product.store.sellerId, sellerId);

    // Check SKU uniqueness
    const existingSku = await productRepository.findVariationBySku(dto.sku);
    if (existingSku) {
      throw new ApiError(409, `SKU "${dto.sku}" already exists`);
    }

    return productRepository.createVariation(productId, dto);
  }

  async updateVariation(
    sellerId: string,
    productId: string,
    variationId: string,
    dto: UpdateVariationDTO,
  ) {
    const variation = await productRepository.findVariationById(variationId);
    if (!variation || variation.product.id !== productId) {
      throw new ApiError(404, "Variation not found");
    }

    await this.enforceVariationOwnership(variation.product.storeId, sellerId);

    // Check SKU uniqueness if updating
    if (dto.sku) {
      const existingSku = await productRepository.findVariationBySku(dto.sku);
      if (existingSku && existingSku.id !== variationId) {
        throw new ApiError(409, `SKU "${dto.sku}" already exists`);
      }
    }

    return productRepository.updateVariation(variationId, dto);
  }

  async removeVariation(
    sellerId: string,
    productId: string,
    variationId: string,
  ) {
    const variation = await productRepository.findVariationById(variationId);
    if (!variation || variation.product.id !== productId) {
      throw new ApiError(404, "Variation not found");
    }

    await this.enforceVariationOwnership(variation.product.storeId, sellerId);

    return productRepository.deleteVariation(variationId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SELLER — Specifications
  // ══════════════════════════════════════════════════════════════════════════

  async addSpec(sellerId: string, productId: string, dto: CreateSpecDTO) {
    const product = await productRepository.findByIdWithStore(productId);
    if (!product) throw new ApiError(404, "Product not found");

    await this.enforceOwnership(product.store.sellerId, sellerId);

    return productRepository.createSpec(productId, dto);
  }

  async updateSpec(
    sellerId: string,
    productId: string,
    specId: string,
    dto: UpdateSpecDTO,
  ) {
    const spec = await productRepository.findSpecById(specId);
    if (!spec || spec.product.id !== productId) {
      throw new ApiError(404, "Specification not found");
    }

    await this.enforceSpecOwnership(spec.product.storeId, sellerId);

    return productRepository.updateSpec(specId, dto);
  }

  async removeSpec(sellerId: string, productId: string, specId: string) {
    const spec = await productRepository.findSpecById(specId);
    if (!spec || spec.product.id !== productId) {
      throw new ApiError(404, "Specification not found");
    }

    await this.enforceSpecOwnership(spec.product.storeId, sellerId);

    return productRepository.deleteSpec(specId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN
  // ══════════════════════════════════════════════════════════════════════════

  async getAllAdminProducts(query: ProductQuery) {
    const { page, limit, skip, take } = getPagination(query);
    const search = query.search?.trim();

    const [products, total] = await Promise.all([
      productRepository.findAllAdmin(skip, take, search),
      productRepository.countAllAdmin(search),
    ]);

    return {
      products,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAdminProductById(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");
    return product;
  }

  async adminUpdateProduct(productId: string, dto: UpdateProductDTO) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    if (dto.categoryId) await this.validateCategoryExists(dto.categoryId);
    if (dto.brandId) await this.validateBrandExists(dto.brandId);

    return productRepository.update(productId, dto);
  }

  async approveProduct(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    if (product.status !== ProductStatus.PENDING) {
      throw new ApiError(400, "Only PENDING products can be approved");
    }

    return productRepository.updateStatus(productId, ProductStatus.PUBLISHED);
  }

  async rejectProduct(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    if (product.status !== ProductStatus.PENDING) {
      throw new ApiError(400, "Only PENDING products can be rejected");
    }

    return productRepository.updateStatus(productId, ProductStatus.DRAFT);
  }

  async archiveProduct(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ApiError(400, "Product is already archived");
    }

    return productRepository.updateStatus(productId, ProductStatus.ARCHIVED);
  }

  async adminSoftDeleteProduct(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");
    return productRepository.softDelete(productId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRIVATE GUARDS
  // ══════════════════════════════════════════════════════════════════════════

  private async enforceOwnership(storeOwnerId: string, sellerId: string) {
    if (storeOwnerId !== sellerId) {
      throw new ApiError(403, "You do not own this product");
    }
  }

  private async enforceVariationOwnership(storeId: string, sellerId: string) {
    const stores = await productRepository.findStoresByOwner(sellerId);
    const owns = stores.some((s) => s.id === storeId);
    if (!owns) throw new ApiError(403, "You do not own this variation");
  }

  private async enforceSpecOwnership(storeId: string, sellerId: string) {
    const stores = await productRepository.findStoresByOwner(sellerId);
    const owns = stores.some((s) => s.id === storeId);
    if (!owns) throw new ApiError(403, "You do not own this specification");
  }

  private async validateCategoryExists(categoryId: string) {
    const { prisma } = await import("../../database/prisma");
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        status: CategoryStatus.APPROVED,
        deletedAt: null,
      },
    });
    if (!category) {
      throw new ApiError(400, "Category does not exist or is not approved");
    }
  }

  private async validateBrandExists(brandId: string) {
    const { prisma } = await import("../../database/prisma");
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, isActive: true },
    });
    if (!brand) {
      throw new ApiError(400, "Brand does not exist or is inactive");
    }
  }
}
