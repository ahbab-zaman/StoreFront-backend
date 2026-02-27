import { NextFunction, Request, Response } from "express";
import { ProductService } from "./product.service";
import { success } from "../../shared/utils/response";
import {
  createProductSchema,
  updateProductSchema,
  createVariationSchema,
  updateVariationSchema,
  createSpecSchema,
  updateSpecSchema,
  productPaginationSchema,
} from "./product.validator";
import { deleteFiles } from "../../shared/utils/file.util";

const productService = new ProductService();

export class ProductController {
  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC
  // ══════════════════════════════════════════════════════════════════════════

  async getPublicProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = productPaginationSchema.parse(req.query);
      const result = await productService.getPublicProducts(query);
      return res.json({
        success: true,
        message: "Products retrieved successfully",
        data: result.products,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const product = await productService.getProductBySlug(slug);
      return success(res, product, "Product retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SELLER — Products
  // ══════════════════════════════════════════════════════════════════════════

  async getSellerProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = productPaginationSchema.parse(req.query);
      const result = await productService.getSellerProducts(
        req.user!.id,
        query,
      );
      return res.json({
        success: true,
        message: "Products retrieved successfully",
        data: result.products,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSellerProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productService.getSellerProductById(
        req.user!.id,
        productId,
      );
      return success(res, product, "Product retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // Handle file uploads
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        if (files["mainImage"]?.[0]) {
          req.body.mainImage = `/uploads/products/${files["mainImage"][0].filename}`;
        }
        if (files["images"]?.length) {
          req.body.images = files["images"].map(
            (f) => `/uploads/products/${f.filename}`,
          );
        }
      }

      const dto = createProductSchema.parse(req.body);
      const product = await productService.createProduct(req.user!.id, dto);

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (err) {
      // Cleanup uploaded files on error
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const filesToDelete = [
          ...(files["mainImage"] || []),
          ...(files["images"] || []),
        ];
        deleteFiles(filesToDelete);
      }
      next(err);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;

      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        if (files["mainImage"]?.[0]) {
          req.body.mainImage = `/uploads/products/${files["mainImage"][0].filename}`;
        }
        if (files["images"]?.length) {
          req.body.images = files["images"].map(
            (f) => `/uploads/products/${f.filename}`,
          );
        }
      }

      const dto = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(
        req.user!.id,
        productId,
        dto,
      );
      return success(res, product, "Product updated successfully");
    } catch (err) {
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const filesToDelete = [
          ...(files["mainImage"] || []),
          ...(files["images"] || []),
        ];
        deleteFiles(filesToDelete);
      }
      next(err);
    }
  }

  async submitForReview(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productService.submitProductForReview(
        req.user!.id,
        productId,
      );
      return success(res, product, "Product submitted for review");
    } catch (err) {
      next(err);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const result = await productService.softDeleteProduct(
        req.user!.id,
        productId,
      );
      return success(res, result, "Product deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SELLER — Variations
  // ══════════════════════════════════════════════════════════════════════════

  async addVariation(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const dto = createVariationSchema.parse(req.body);
      const variation = await productService.addVariation(
        req.user!.id,
        productId,
        dto,
      );
      return res.status(201).json({
        success: true,
        message: "Variation added successfully",
        data: variation,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateVariation(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const variationId = req.params.variationId as string;
      const dto = updateVariationSchema.parse(req.body);
      const variation = await productService.updateVariation(
        req.user!.id,
        productId,
        variationId,
        dto,
      );
      return success(res, variation, "Variation updated successfully");
    } catch (err) {
      next(err);
    }
  }

  async removeVariation(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const variationId = req.params.variationId as string;
      await productService.removeVariation(
        req.user!.id,
        productId,
        variationId,
      );
      return success(res, null, "Variation removed successfully");
    } catch (err) {
      next(err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SELLER — Specifications
  // ══════════════════════════════════════════════════════════════════════════

  async addSpec(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const dto = createSpecSchema.parse(req.body);
      const spec = await productService.addSpec(req.user!.id, productId, dto);
      return res.status(201).json({
        success: true,
        message: "Specification added successfully",
        data: spec,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSpec(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const specId = req.params.specId as string;
      const dto = updateSpecSchema.parse(req.body);
      const spec = await productService.updateSpec(
        req.user!.id,
        productId,
        specId,
        dto,
      );
      return success(res, spec, "Specification updated successfully");
    } catch (err) {
      next(err);
    }
  }

  async removeSpec(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const specId = req.params.specId as string;
      await productService.removeSpec(req.user!.id, productId, specId);
      return success(res, null, "Specification removed successfully");
    } catch (err) {
      next(err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN
  // ══════════════════════════════════════════════════════════════════════════

  async getAllAdminProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = productPaginationSchema.parse(req.query);
      const result = await productService.getAllAdminProducts(query);
      return res.json({
        success: true,
        message: "Products retrieved successfully",
        data: result.products,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productService.getAdminProductById(productId);
      return success(res, product, "Product retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async adminUpdateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const dto = updateProductSchema.parse(req.body);
      const product = await productService.adminUpdateProduct(productId, dto);
      return success(res, product, "Product updated successfully");
    } catch (err) {
      next(err);
    }
  }

  async approveProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productService.approveProduct(productId);
      return success(res, product, "Product approved successfully");
    } catch (err) {
      next(err);
    }
  }

  async rejectProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productService.rejectProduct(productId);
      return success(res, product, "Product rejected back to draft");
    } catch (err) {
      next(err);
    }
  }

  async archiveProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productService.archiveProduct(productId);
      return success(res, product, "Product archived successfully");
    } catch (err) {
      next(err);
    }
  }

  async adminDeleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const result = await productService.adminSoftDeleteProduct(productId);
      return success(res, result, "Product deleted successfully");
    } catch (err) {
      next(err);
    }
  }
}
