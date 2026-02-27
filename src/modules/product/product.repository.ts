import { prisma } from "../../database/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import type {
  CreateProductDTO,
  UpdateProductDTO,
  CreateVariationDTO,
  UpdateVariationDTO,
  CreateSpecDTO,
  UpdateSpecDTO,
  ProductQuery,
} from "./product.types";

// ─── Prisma Select: Public-safe product fields ──────────────────────────────

const productPublicSelect = {
  id: true,
  name: true,
  slug: true,
  shortDesc: true,
  description: true,
  mainImage: true,
  images: true,
  video: true,
  status: true,
  isFeatured: true,
  avgRating: true,
  totalReviews: true,
  metaTitle: true,
  metaDesc: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, icon: true } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  store: { select: { id: true, name: true, slug: true, logo: true } },
  variations: {
    select: {
      id: true,
      sku: true,
      price: true,
      discountPrice: true,
      stock: true,
      isDigital: true,
      image: true,
      weight: true,
      dimensions: true,
      attributes: {
        select: {
          attributeValue: {
            select: {
              id: true,
              value: true,
              meta: true,
              attribute: { select: { id: true, name: true, type: true } },
            },
          },
        },
      },
    },
  },
  specs: {
    select: { id: true, key: true, value: true },
  },
} satisfies Prisma.ProductSelect;

// Lightweight list select (no variations/specs for list performance)
const productListSelect = {
  id: true,
  name: true,
  slug: true,
  shortDesc: true,
  mainImage: true,
  status: true,
  isFeatured: true,
  avgRating: true,
  totalReviews: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, slug: true } },
  variations: {
    select: { id: true, price: true, discountPrice: true, stock: true },
    take: 1,
    orderBy: { price: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

// Full select with ownership fields
const productFullSelect = {
  ...productPublicSelect,
  storeId: true,
  categoryId: true,
  brandId: true,
  deletedAt: true,
} satisfies Prisma.ProductSelect;

export class ProductRepository {
  // ── Find ────────────────────────────────────────────────────────────────

  findById(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: productFullSelect,
    });
  }

  findByIdWithStore(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...productFullSelect,
        store: { select: { id: true, sellerId: true, status: true } },
      },
    });
  }

  findBySlugPublic(slug: string) {
    return prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED, deletedAt: null },
      select: productPublicSelect,
    });
  }

  findSlugsByBase(baseSlug: string) {
    return prisma.product.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
  }

  // ── Public List ─────────────────────────────────────────────────────────

  findPublicProducts(
    skip: number,
    take: number,
    filters: ProductQuery,
    orderBy: Prisma.ProductOrderByWithRelationInput,
  ) {
    const where = this.buildPublicWhere(filters);
    return prisma.product.findMany({
      where,
      select: productListSelect,
      skip,
      take,
      orderBy,
    });
  }

  countPublicProducts(filters: ProductQuery) {
    const where = this.buildPublicWhere(filters);
    return prisma.product.count({ where });
  }

  private buildPublicWhere(filters: ProductQuery): Prisma.ProductWhereInput {
    return {
      status: ProductStatus.PUBLISHED,
      deletedAt: null,
      ...(filters.search
        ? {
            name: {
              contains: filters.search,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.minPrice || filters.maxPrice
        ? {
            variations: {
              some: {
                ...(filters.minPrice
                  ? { price: { gte: filters.minPrice } }
                  : {}),
                ...(filters.maxPrice
                  ? { price: { lte: filters.maxPrice } }
                  : {}),
              },
            },
          }
        : {}),
    };
  }

  // ── Seller List ─────────────────────────────────────────────────────────

  findSellerProducts(
    storeIds: string[],
    skip: number,
    take: number,
    search?: string,
  ) {
    return prisma.product.findMany({
      where: {
        storeId: { in: storeIds },
        deletedAt: null,
        ...(search
          ? {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
      },
      select: productListSelect,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  countSellerProducts(storeIds: string[], search?: string) {
    return prisma.product.count({
      where: {
        storeId: { in: storeIds },
        deletedAt: null,
        ...(search
          ? {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
      },
    });
  }

  // ── Admin List ──────────────────────────────────────────────────────────

  findAllAdmin(skip: number, take: number, search?: string) {
    return prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
      },
      select: {
        ...productListSelect,
        storeId: true,
        deletedAt: true,
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  countAllAdmin(search?: string) {
    return prisma.product.count({
      where: {
        deletedAt: null,
        ...(search
          ? {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
      },
    });
  }

  // ── Mutate Product ──────────────────────────────────────────────────────

  create(data: CreateProductDTO & { slug: string }) {
    return prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDesc: data.shortDesc,
        mainImage: data.mainImage || "",
        images: data.images || [],
        video: data.video,
        status: ProductStatus.DRAFT,
        storeId: data.storeId,
        categoryId: data.categoryId,
        brandId: data.brandId,
        metaTitle: data.metaTitle,
        metaDesc: data.metaDesc,
        tags: data.tags || [],
      },
      select: productFullSelect,
    });
  }

  update(id: string, data: UpdateProductDTO) {
    return prisma.product.update({
      where: { id },
      data,
      select: productFullSelect,
    });
  }

  updateStatus(id: string, status: ProductStatus) {
    return prisma.product.update({
      where: { id },
      data: { status },
      select: productFullSelect,
    });
  }

  softDelete(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, name: true, deletedAt: true },
    });
  }

  // ── Variations ──────────────────────────────────────────────────────────

  findVariationById(variationId: string) {
    return prisma.productVariation.findUnique({
      where: { id: variationId },
      include: { product: { select: { id: true, storeId: true } } },
    });
  }

  findVariationBySku(sku: string) {
    return prisma.productVariation.findUnique({
      where: { sku },
    });
  }

  createVariation(productId: string, data: CreateVariationDTO) {
    return prisma.productVariation.create({
      data: {
        productId,
        sku: data.sku,
        price: data.price,
        discountPrice: data.discountPrice,
        stock: data.stock,
        isDigital: data.isDigital || false,
        image: data.image,
        weight: data.weight,
        dimensions: data.dimensions,
        ...(data.attributeValueIds?.length
          ? {
              attributes: {
                create: data.attributeValueIds.map((avId) => ({
                  attributeValueId: avId,
                })),
              },
            }
          : {}),
      },
      include: {
        attributes: {
          select: {
            attributeValue: {
              select: {
                id: true,
                value: true,
                attribute: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  updateVariation(variationId: string, data: UpdateVariationDTO) {
    return prisma.productVariation.update({
      where: { id: variationId },
      data,
    });
  }

  deleteVariation(variationId: string) {
    return prisma.productVariation.delete({
      where: { id: variationId },
    });
  }

  // ── Specifications ──────────────────────────────────────────────────────

  findSpecById(specId: string) {
    return prisma.productSpecification.findUnique({
      where: { id: specId },
      include: { product: { select: { id: true, storeId: true } } },
    });
  }

  createSpec(productId: string, data: CreateSpecDTO) {
    return prisma.productSpecification.create({
      data: { productId, key: data.key, value: data.value },
    });
  }

  updateSpec(specId: string, data: UpdateSpecDTO) {
    return prisma.productSpecification.update({
      where: { id: specId },
      data,
    });
  }

  deleteSpec(specId: string) {
    return prisma.productSpecification.delete({
      where: { id: specId },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  findStoresByOwner(sellerId: string) {
    return prisma.store.findMany({
      where: { sellerId, deletedAt: null },
      select: { id: true, status: true },
    });
  }
}
