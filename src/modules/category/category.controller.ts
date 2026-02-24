import { NextFunction, Request, Response } from "express";
import { CategoryService } from "./category.service";
import { success, fail } from "../../shared/utils/response";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryPaginationSchema,
} from "./category.validator";
import { deleteFiles } from "../../shared/utils/file.util";

const categoryService = new CategoryService();

export class CategoryController {
  // ── Public ─────────────────────────────────────────────────────────────────

  async getPublicCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const query = categoryPaginationSchema.parse(req.query);
      const result = await categoryService.getPublicCategories(query);
      return res.json({
        success: true,
        message: "Categories retrieved successfully",
        data: result.categories,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const category = await categoryService.getCategoryBySlug(slug);
      return success(res, category, "Category retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getAllAdminCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const query = categoryPaginationSchema.parse(req.query);
      const result = await categoryService.getAllAdminCategories(query);
      return res.json({
        success: true,
        message: "Categories retrieved successfully",
        data: result.categories,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await categoryService.getAdminCategoryById(id);
      return success(res, category, "Category retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.file) {
        req.body.icon = `/uploads/categories/${req.file.filename}`;
      }

      const dto = createCategorySchema.parse(req.body);
      const category = await categoryService.createCategory(req.user!.id, dto);

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (err) {
      if (req.file) deleteFiles([req.file]);
      next(err);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      if (req.file) {
        req.body.icon = `/uploads/categories/${req.file.filename}`;
      }

      const dto = updateCategorySchema.parse(req.body);
      const category = await categoryService.updateCategory(id, dto);

      return success(res, category, "Category updated successfully");
    } catch (err) {
      if (req.file) deleteFiles([req.file]);
      next(err);
    }
  }

  // ── Admin Workflows ────────────────────────────────────────────────────────

  async approveCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await categoryService.approveCategory(id);
      return success(res, category, "Category approved successfully");
    } catch (err) {
      next(err);
    }
  }

  async rejectCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await categoryService.rejectCategory(id);
      return success(res, category, "Category rejected successfully");
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await categoryService.softDeleteCategory(id);
      return success(res, result, "Category deleted successfully");
    } catch (err) {
      next(err);
    }
  }
}
