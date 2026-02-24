import ApiError from "../../shared/errors/api-error";
import { getPagination } from "../../shared/utils/pagination";
import { CategoryRepository } from "./category.repository";
import { CategoryStatus } from "@prisma/client";
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryQuery,
} from "./category.types";

const categoryRepository = new CategoryRepository();

// ─── Slug Utilities ──────────────────────────────────────────────────────────

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
  const existing = await categoryRepository.findSlugsByBase(base);
  const existingSlugs = new Set(existing.map((s: { slug: string }) => s.slug));

  if (!existingSlugs.has(base)) return base;

  let counter = 1;
  while (existingSlugs.has(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

export class CategoryService {
  // ── Public Access ─────────────────────────────────────────────────────────

  async getPublicCategories(query: CategoryQuery) {
    const { page, limit, skip, take } = getPagination(query);
    const search = query.search?.trim();

    const [categories, total] = await Promise.all([
      categoryRepository.findPublicCategories(skip, take, search),
      categoryRepository.countPublicCategories(search),
    ]);

    return {
      categories,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCategoryBySlug(slug: string) {
    const category = await categoryRepository.findApprovedBySlug(slug);
    if (!category) {
      throw new ApiError(404, "Category not found");
    }
    return category;
  }

  // ── Admin Access ──────────────────────────────────────────────────────────

  async getAllAdminCategories(query: CategoryQuery) {
    const { page, limit, skip, take } = getPagination(query);
    const search = query.search?.trim();

    const [categories, total] = await Promise.all([
      categoryRepository.findAllAdminCategories(skip, take, search),
      categoryRepository.countAllAdminCategories(search),
    ]);

    return {
      categories,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAdminCategoryById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category || category.deletedAt)
      throw new ApiError(404, "Category not found");
    return category;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async createCategory(adminId: string, dto: CreateCategoryDTO) {
    // Generate slug if not provided, or sanitize provided one
    const slugBasis = dto.slug ? dto.slug : dto.name;
    const slug = await generateUniqueSlug(slugBasis);

    const category = await categoryRepository.create({
      ...dto,
      slug,
      status: dto.status || CategoryStatus.PENDING,
      createdBy: adminId,
    });

    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDTO) {
    const category = await categoryRepository.findById(id);
    if (!category || category.deletedAt)
      throw new ApiError(404, "Category not found");

    return categoryRepository.update(id, dto);
  }

  // ── Workflow Status ───────────────────────────────────────────────────────

  async approveCategory(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category || category.deletedAt)
      throw new ApiError(404, "Category not found");

    if (category.status === CategoryStatus.APPROVED) {
      throw new ApiError(400, "Category is already approved");
    }

    return categoryRepository.updateStatus(id, CategoryStatus.APPROVED);
  }

  async rejectCategory(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category || category.deletedAt)
      throw new ApiError(404, "Category not found");

    if (category.status === CategoryStatus.REJECTED) {
      throw new ApiError(400, "Category is already rejected");
    }

    return categoryRepository.updateStatus(id, CategoryStatus.REJECTED);
  }

  // ── Deletion ──────────────────────────────────────────────────────────────

  async softDeleteCategory(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category || category.deletedAt)
      throw new ApiError(404, "Category not found");

    const productCount = await categoryRepository.countProductsByCategory(id);
    if (productCount > 0) {
      throw new ApiError(
        409,
        "Cannot delete category with associated products. Reassign the products first.",
      );
    }

    return categoryRepository.softDelete(id);
  }
}
