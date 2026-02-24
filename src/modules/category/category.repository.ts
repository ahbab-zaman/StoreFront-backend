import { prisma } from "../../database/prisma";
import { Prisma, CategoryStatus } from "@prisma/client";
import { CreateCategoryDTO, UpdateCategoryDTO } from "./category.types";

export class CategoryRepository {
  // ── Find ────────────────────────────────────────────────────────────────

  findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
    });
  }

  findApprovedBySlug(slug: string) {
    return prisma.category.findFirst({
      where: {
        slug,
        status: CategoryStatus.APPROVED,
        deletedAt: null,
      },
    });
  }

  findSlugsByBase(baseSlug: string) {
    return prisma.category.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
  }

  // ── Lists ───────────────────────────────────────────────────────────────

  findPublicCategories(skip: number, take: number, search?: string) {
    return prisma.category.findMany({
      where: {
        status: CategoryStatus.APPROVED,
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
      skip,
      take,
      orderBy: { name: "asc" },
    });
  }

  countPublicCategories(search?: string) {
    return prisma.category.count({
      where: {
        status: CategoryStatus.APPROVED,
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
    });
  }

  findAllAdminCategories(skip: number, take: number, search?: string) {
    return prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { name: true, email: true } },
      },
    });
  }

  countAllAdminCategories(search?: string) {
    return prisma.category.count({
      where: {
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      },
    });
  }

  // ── Mutate ──────────────────────────────────────────────────────────────

  create(
    data: CreateCategoryDTO & { createdBy: string; status: CategoryStatus },
  ) {
    return prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug as string,
        icon: data.icon,
        status: data.status,
        createdBy: data.createdBy,
      },
    });
  }

  update(id: string, data: UpdateCategoryDTO) {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  updateStatus(id: string, status: CategoryStatus) {
    return prisma.category.update({
      where: { id },
      data: { status },
    });
  }

  softDelete(id: string) {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Helper for guard logic
  countProductsByCategory(id: string) {
    return prisma.product.count({
      where: { categoryId: id },
    });
  }
}
