import { Router, Request, Response, NextFunction } from "express";
import { CartController } from "./cart.controller";
import {
  authenticate,
  authorizeRoles,
} from "../../middlewares/auth.middleware";
import { Role } from "@prisma/client";

const router = Router();
const cartController = new CartController();

// All cart routes require authentication + CUSTOMER role
router.use(authenticate, authorizeRoles(Role.CUSTOMER));

// ── Cart ─────────────────────────────────────────────────────────────────────

// GET /v1/cart — get current user's hydrated cart
router.get("/", (req: Request, res: Response, next: NextFunction) =>
  cartController.getCart(req, res, next),
);

// POST /v1/cart/items — add a variation (or bump quantity if already in cart)
router.post("/items", (req: Request, res: Response, next: NextFunction) =>
  cartController.addItem(req, res, next),
);

// POST /v1/cart/merge — merge guest (localStorage) cart on login
// NOTE: registered before /:itemId to avoid route collision
router.post("/merge", (req: Request, res: Response, next: NextFunction) =>
  cartController.mergeCart(req, res, next),
);

// PATCH /v1/cart/items/:itemId — update quantity (quantity=0 removes the item)
router.patch(
  "/items/:itemId",
  (req: Request, res: Response, next: NextFunction) =>
    cartController.updateItem(req, res, next),
);

// DELETE /v1/cart/items/:itemId — remove a single item
router.delete(
  "/items/:itemId",
  (req: Request, res: Response, next: NextFunction) =>
    cartController.removeItem(req, res, next),
);

// DELETE /v1/cart — clear all items
router.delete("/", (req: Request, res: Response, next: NextFunction) =>
  cartController.clearCart(req, res, next),
);

export default router;
