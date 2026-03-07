import ApiError from "../../shared/errors/api-error";
import { CartRepository } from "./cart.repository";
import { prisma } from "../../database/prisma";
import { ProductStatus, StoreStatus } from "@prisma/client";
import type {
  HydratedCart,
  HydratedCartItem,
  MergeGuestItem,
  MergeResult,
  SkippedMergeItem,
} from "./cart.types";

const cartRepository = new CartRepository();

// ─── Cart Service ─────────────────────────────────────────────────────────────

export class CartService {
  // ════════════════════════════════════════════════════════════════════════════
  //  PUBLIC METHODS
  // ════════════════════════════════════════════════════════════════════════════

  async getCart(userId: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId);
    const hydrated = await cartRepository.getHydratedCart(cart.id);
    return this.buildHydratedCart(hydrated!);
  }

  async addItem(
    userId: string,
    variationId: string,
    requestedQty: number,
  ): Promise<HydratedCart> {
    // 1. Get or create the user's cart
    const cart = await this.getOrCreateCart(userId);

    // 2. Validate the variation (throws on failure)
    const variation = await this.validateVariation(variationId, requestedQty);
    const storeId = variation.product.store.id;

    // 3. Enforce single-store rule
    if (cart.storeId && cart.storeId !== storeId) {
      throw new ApiError(
        400,
        "Your cart already contains items from another store. Please clear your cart before adding items from a different store.",
      );
    }

    // 4. Determine final quantity (additive if item already exists)
    const existingItem = await cartRepository.findCartItem(
      cart.id,
      variationId,
    );
    const newQty = existingItem
      ? existingItem.quantity + requestedQty
      : requestedQty;

    // 5. Re-validate the combined quantity against stock
    if (newQty > variation.stock) {
      throw new ApiError(
        400,
        `Only ${variation.stock} unit(s) available. You already have ${existingItem?.quantity ?? 0} in your cart.`,
      );
    }

    // 6. Upsert the cart item
    const effectivePrice = variation.discountPrice ?? variation.price;
    await cartRepository.upsertCartItem(
      cart.id,
      variationId,
      newQty,
      effectivePrice,
    );

    // 7. Bind store to cart on first item
    if (!cart.storeId) {
      await cartRepository.setCartStore(cart.id, storeId);
    }

    // 8. Return freshly hydrated cart
    const hydrated = await cartRepository.getHydratedCart(cart.id);
    return this.buildHydratedCart(hydrated!);
  }

  async updateItemQty(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId);

    // Ensure item belongs to this user's cart
    const item = await cartRepository.findCartItemById(itemId);
    if (!item || item.cartId !== cart.id) {
      throw new ApiError(404, "Cart item not found");
    }

    // quantity = 0 → treat as removal
    if (quantity === 0) {
      await cartRepository.deleteCartItem(itemId);
      await this.autoResetStoreIfEmpty(cart.id);
      const hydrated = await cartRepository.getHydratedCart(cart.id);
      return this.buildHydratedCart(hydrated!);
    }

    // Validate stock for the new quantity
    const variation = await this.validateVariation(item.variationId, quantity);
    if (quantity > variation.stock) {
      throw new ApiError(
        400,
        `Only ${variation.stock} unit(s) available in stock`,
      );
    }

    await cartRepository.updateCartItemQty(itemId, quantity);
    const hydrated = await cartRepository.getHydratedCart(cart.id);
    return this.buildHydratedCart(hydrated!);
  }

  async removeItem(userId: string, itemId: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId);

    const item = await cartRepository.findCartItemById(itemId);
    if (!item || item.cartId !== cart.id) {
      throw new ApiError(404, "Cart item not found");
    }

    await cartRepository.deleteCartItem(itemId);
    await this.autoResetStoreIfEmpty(cart.id);

    const hydrated = await cartRepository.getHydratedCart(cart.id);
    return this.buildHydratedCart(hydrated!);
  }

  async clearCart(userId: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId);
    await cartRepository.clearCart(cart.id);
    const hydrated = await cartRepository.getHydratedCart(cart.id);
    return this.buildHydratedCart(hydrated!);
  }

  async mergeGuestCart(
    userId: string,
    guestItems: MergeGuestItem[],
  ): Promise<MergeResult> {
    const cart = await this.getOrCreateCart(userId);

    let mergedCount = 0;
    const skippedItems: SkippedMergeItem[] = [];

    for (const guestItem of guestItems) {
      try {
        // Validate variation — will throw on invalid/OOS/unpublished
        const variation = await this.validateVariation(
          guestItem.variationId,
          guestItem.quantity,
        );
        const storeId = variation.product.store.id;

        // Enforce single-store rule silently during merge
        if (cart.storeId && cart.storeId !== storeId) {
          skippedItems.push({
            variationId: guestItem.variationId,
            reason: "Item belongs to a different store than your current cart",
          });
          continue;
        }

        // Calculate additive quantity
        const existingItem = await cartRepository.findCartItem(
          cart.id,
          guestItem.variationId,
        );
        const newQty = existingItem
          ? Math.min(
              existingItem.quantity + guestItem.quantity,
              variation.stock,
            )
          : Math.min(guestItem.quantity, variation.stock);

        const effectivePrice = variation.discountPrice ?? variation.price;
        await cartRepository.upsertCartItem(
          cart.id,
          guestItem.variationId,
          newQty,
          effectivePrice,
        );

        // Bind store to cart after first successful merge
        if (!cart.storeId) {
          await cartRepository.setCartStore(cart.id, storeId);
          // Update in-memory so subsequent items can check it
          cart.storeId = storeId;
        }

        mergedCount++;
      } catch (err) {
        // Gracefully skip invalid items — never fail the whole merge
        const reason =
          err instanceof ApiError ? err.message : "Item is unavailable";
        skippedItems.push({ variationId: guestItem.variationId, reason });
      }
    }

    const hydrated = await cartRepository.getHydratedCart(cart.id);
    return {
      mergedCount,
      skippedCount: skippedItems.length,
      skippedItems,
      cart: this.buildHydratedCart(hydrated!),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  /** Returns the user's cart, creating one if it doesn't exist yet. */
  private async getOrCreateCart(userId: string) {
    let cart = await cartRepository.findCartByUserId(userId);
    if (!cart) cart = await cartRepository.createCart(userId);
    return cart;
  }

  /**
   * Validates that a variation is purchasable:
   * - Exists
   * - Product is PUBLISHED
   * - Store is APPROVED
   * - Requested quantity ≥ 1 and within stock
   */
  private async validateVariation(variationId: string, requestedQty: number) {
    const variation = await prisma.productVariation.findUnique({
      where: { id: variationId },
      include: {
        product: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!variation) {
      throw new ApiError(404, "Product variation not found");
    }

    if (variation.product.status !== ProductStatus.PUBLISHED) {
      throw new ApiError(400, "This product is not available");
    }

    if (variation.product.store.status !== StoreStatus.APPROVED) {
      throw new ApiError(400, "This store is not currently accepting orders");
    }

    if (variation.stock < 1) {
      throw new ApiError(400, "This item is out of stock");
    }

    if (requestedQty > variation.stock) {
      throw new ApiError(
        400,
        `Only ${variation.stock} unit(s) available in stock`,
      );
    }

    return variation;
  }

  /**
   * If the cart becomes empty after removing an item,
   * reset the store scope so a new store can be chosen next time.
   */
  private async autoResetStoreIfEmpty(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: { _count: { select: { items: true } } },
    });
    if (!cart || cart._count.items === 0) {
      await cartRepository.setCartStore(cartId, null);
    }
  }

  /**
   * Maps the raw Prisma hydrated cart result into a clean HydratedCart DTO.
   * Computes derived fields: isPriceChanged, totalItems, subtotal.
   */
  private buildHydratedCart(
    raw: NonNullable<Awaited<ReturnType<CartRepository["getHydratedCart"]>>>,
  ): HydratedCart {
    const items: HydratedCartItem[] = raw.items.map(
      (item: (typeof raw.items)[number]) => {
        const { variation } = item;
        const currentPrice = variation.discountPrice ?? variation.price;

        return {
          id: item.id,
          variationId: variation.id,
          sku: variation.sku,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          currentPrice,
          isPriceChanged: item.priceAtAdd !== currentPrice,
          stock: variation.stock,
          image: variation.image,
          attributes: variation.attributes.map(
            (a: (typeof variation.attributes)[number]) => ({
              name: a.attributeValue.attribute.name,
              value: a.attributeValue.value,
            }),
          ),
          product: {
            id: variation.product.id,
            name: variation.product.name,
            slug: variation.product.slug,
            mainImage: variation.product.mainImage,
          },
          store: {
            id: variation.product.store.id,
            name: variation.product.store.name,
            slug: variation.product.store.slug,
          },
        };
      },
    );

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce(
      (sum, i) => sum + i.currentPrice * i.quantity,
      0,
    );

    return {
      id: raw.id,
      userId: raw.userId,
      storeId: raw.storeId,
      items,
      totalItems,
      subtotal: Math.round(subtotal * 100) / 100, // 2 decimal precision
      updatedAt: raw.updatedAt,
    };
  }
}
