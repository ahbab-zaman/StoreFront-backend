import { NextFunction, Request, Response } from "express";
import { CartService } from "./cart.service";
import {
  AddCartItemSchema,
  UpdateCartItemSchema,
  MergeCartSchema,
} from "./cart.validator";

const cartService = new CartService();

// ─── Cart Controller ──────────────────────────────────────────────────────────

export class CartController {
  // GET /v1/cart
  async getCart(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const cart = await cartService.getCart(req.user!.id);
      res.status(200).json({
        success: true,
        message: "Cart retrieved successfully",
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /v1/cart/items
  async addItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { variationId, quantity } = AddCartItemSchema.parse(req.body);
      const cart = await cartService.addItem(
        req.user!.id,
        variationId,
        quantity,
      );

      res.status(200).json({
        success: true,
        message: "Item added to cart",
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /v1/cart/items/:itemId
  async updateItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { quantity } = UpdateCartItemSchema.parse(req.body);
      const itemId = req.params.itemId as string;
      const cart = await cartService.updateItemQty(
        req.user!.id,
        itemId,
        quantity,
      );

      res.status(200).json({
        success: true,
        message:
          quantity === 0 ? "Item removed from cart" : "Cart item updated",
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /v1/cart/items/:itemId
  async removeItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const itemId = req.params.itemId as string;
      const cart = await cartService.removeItem(req.user!.id, itemId);

      res.status(200).json({
        success: true,
        message: "Item removed from cart",
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /v1/cart
  async clearCart(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const cart = await cartService.clearCart(req.user!.id);

      res.status(200).json({
        success: true,
        message: "Cart cleared",
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /v1/cart/merge
  async mergeCart(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { items } = MergeCartSchema.parse(req.body);
      const result = await cartService.mergeGuestCart(req.user!.id, items);

      res.status(200).json({
        success: true,
        message:
          result.mergedCount === 0
            ? "No items could be merged. They may be out of stock or unavailable."
            : `${result.mergedCount} item(s) merged into your cart.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
