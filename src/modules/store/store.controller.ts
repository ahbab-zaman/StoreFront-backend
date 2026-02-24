import { NextFunction, Request, Response } from "express";
import { StoreService } from "./store.service";
import { success } from "../../shared/utils/response";
import {
  createStoreSchema,
  updateStoreSchema,
  storeListQuerySchema,
} from "./store.validator";
import { deleteFiles } from "../../shared/utils/file.util";

const storeService = new StoreService();

export class StoreController {
  // ── POST /stores ──────────────────────────────────────────────────────────
  async createStore(req: Request, res: Response, next: NextFunction) {
    try {
      // Handle file uploads
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        if (files["logo"]?.[0]) {
          req.body.logo = `/uploads/stores/${files["logo"][0].filename}`;
        }
        if (files["banner"]?.[0]) {
          req.body.banner = `/uploads/stores/${files["banner"][0].filename}`;
        }
      }

      const dto = createStoreSchema.parse(req.body);
      const store = await storeService.createStore(req.user!.id, dto);
      return res.status(201).json({
        success: true,
        message: "Store created successfully",
        data: store,
      });
    } catch (err) {
      // Cleanup uploaded files on error
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const filesToDelete = [
          ...(files["logo"] || []),
          ...(files["banner"] || []),
        ];
        deleteFiles(filesToDelete);
      }
      return next(err);
    }
  }

  // ── PATCH /stores/:id ─────────────────────────────────────────────────────
  async updateStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.id as string;

      // Handle file uploads
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        if (files["logo"]?.[0]) {
          req.body.logo = `/uploads/stores/${files["logo"][0].filename}`;
        }
        if (files["banner"]?.[0]) {
          req.body.banner = `/uploads/stores/${files["banner"][0].filename}`;
        }
      }

      const dto = updateStoreSchema.parse(req.body);
      const store = await storeService.updateStore(storeId, req.user!.id, dto);
      return success(res, store, "Store updated successfully");
    } catch (err) {
      // Cleanup uploaded files on error
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const filesToDelete = [
          ...(files["logo"] || []),
          ...(files["banner"] || []),
        ];
        deleteFiles(filesToDelete);
      }
      return next(err);
    }
  }

  // ── GET /stores/me ────────────────────────────────────────────────────────
  async getMyStore(req: Request, res: Response, next: NextFunction) {
    try {
      const stores = await storeService.getMyStores(req.user!.id);
      return success(res, stores, "Stores retrieved successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ── GET /stores ───────────────────────────────────────────────────────────
  async getPublicStores(req: Request, res: Response, next: NextFunction) {
    try {
      const query = storeListQuerySchema.parse(req.query);
      const result = await storeService.getPublicStores(query);
      return res.json({
        success: true,
        message: "Stores retrieved successfully",
        data: result.stores,
        meta: result.meta,
      });
    } catch (err) {
      return next(err);
    }
  }

  // ── GET /stores/:slug ─────────────────────────────────────────────────────
  async getStoreBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const store = await storeService.getStoreBySlug(slug);
      return success(res, store, "Store retrieved successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ── PATCH /stores/:id/approve ─────────────────────────────────────────────
  async approveStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.id as string;
      const store = await storeService.approveStore(storeId);
      return success(res, store, "Store approved successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ── PATCH /stores/:id/reject ──────────────────────────────────────────────
  async rejectStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.id as string;
      const store = await storeService.rejectStore(storeId);
      return success(res, store, "Store rejected successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ── PATCH /stores/:id/suspend ─────────────────────────────────────────────
  async suspendStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.id as string;
      const store = await storeService.suspendStore(storeId);
      return success(res, store, "Store suspended successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ── DELETE /stores/:id ────────────────────────────────────────────────────
  async softDeleteStore(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.id as string;
      const result = await storeService.softDeleteStore(storeId);
      return success(res, result, "Store deleted successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ── PATCH /stores/:id/toggle-open ─────────────────────────────────────────
  async toggleOpen(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.id as string;
      const store = await storeService.toggleOpen(storeId, req.user!.id);
      return success(
        res,
        store,
        `Store is now ${store.isOpen ? "open" : "closed"}`,
      );
    } catch (err) {
      return next(err);
    }
  }
}
