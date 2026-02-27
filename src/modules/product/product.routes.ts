import { Router } from "express";
import { ProductController } from "./product.controller";
import {
  authenticate,
  authorizeRoles,
} from "../../middlewares/auth.middleware";
import { Role } from "@prisma/client";
import { createUploader } from "../../middlewares/upload.middleware";

const router = Router();
const productController = new ProductController();

// Product image uploader
const upload = createUploader("products");
const productUpload = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

// ── Public Routes (No Auth) ─────────────────────────────────────────────────
// PUBLISHED products only, soft-deleted excluded
router.get("/", productController.getPublicProducts);
router.get("/:slug", productController.getProductBySlug);

// ── Seller Routes ────────────────────────────────────────────────────────────
const sellerRouter = Router();
sellerRouter.use(authenticate, authorizeRoles(Role.SELLER));

// Products
sellerRouter.get("/me", productController.getSellerProducts);
sellerRouter.get("/:id", productController.getSellerProductById);
sellerRouter.post("/", productUpload, productController.createProduct);
sellerRouter.patch("/:id", productUpload, productController.updateProduct);
sellerRouter.patch("/:id/submit", productController.submitForReview);
sellerRouter.delete("/:id", productController.deleteProduct);

// Variations
sellerRouter.post("/:id/variations", productController.addVariation);
sellerRouter.patch(
  "/:id/variations/:variationId",
  productController.updateVariation,
);
sellerRouter.delete(
  "/:id/variations/:variationId",
  productController.removeVariation,
);

// Specifications
sellerRouter.post("/:id/specs", productController.addSpec);
sellerRouter.patch("/:id/specs/:specId", productController.updateSpec);
sellerRouter.delete("/:id/specs/:specId", productController.removeSpec);

router.use("/seller", sellerRouter);

// ── Admin Routes ─────────────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, authorizeRoles(Role.ADMIN));

adminRouter.get("/all", productController.getAllAdminProducts);
adminRouter.get("/:id", productController.getAdminProductById);
adminRouter.patch("/:id", productController.adminUpdateProduct);
adminRouter.patch("/:id/approve", productController.approveProduct);
adminRouter.patch("/:id/reject", productController.rejectProduct);
adminRouter.patch("/:id/archive", productController.archiveProduct);
adminRouter.delete("/:id", productController.adminDeleteProduct);

router.use("/admin", adminRouter);

export default router;
