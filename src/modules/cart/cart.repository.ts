import { prisma } from "../../database/prisma";

// ─── Cart Repository ──────────────────────────────────────────────────────────

export class CartRepository {
  // ── Find or check cart ────────────────────────────────────────────────────

  async findCartByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
  }

  // ── Create empty cart ─────────────────────────────────────────────────────

  async createCart(userId: string) {
    return prisma.cart.create({
      data: { userId },
      include: { items: true },
    });
  }

  // ── Find a specific item inside a cart ────────────────────────────────────

  async findCartItem(cartId: string, variationId: string) {
    return prisma.cartItem.findUnique({
      where: {
        cartId_variationId: { cartId, variationId },
      },
    });
  }

  // ── Find a single CartItem by its own ID (for security checks) ────────────

  async findCartItemById(itemId: string) {
    return prisma.cartItem.findUnique({
      where: { id: itemId },
    });
  }

  // ── Upsert a cart item (insert or bump quantity) ─────────────────────────

  async upsertCartItem(
    cartId: string,
    variationId: string,
    quantity: number,
    priceAtAdd: number,
  ) {
    return prisma.cartItem.upsert({
      where: {
        cartId_variationId: { cartId, variationId },
      },
      update: { quantity, updatedAt: new Date() },
      create: { cartId, variationId, quantity, priceAtAdd },
    });
  }

  // ── Update quantity of an existing item ───────────────────────────────────

  async updateCartItemQty(itemId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity, updatedAt: new Date() },
    });
  }

  // ── Set the store scoped to this cart ─────────────────────────────────────

  async setCartStore(cartId: string, storeId: string | null) {
    return prisma.cart.update({
      where: { id: cartId },
      data: { storeId },
    });
  }

  // ── Remove a single item ──────────────────────────────────────────────────

  async deleteCartItem(itemId: string) {
    return prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  // ── Remove all items and reset the store scope ────────────────────────────

  async clearCart(cartId: string) {
    return prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId } }),
      prisma.cart.update({
        where: { id: cartId },
        data: { storeId: null },
      }),
    ]);
  }

  // ── Full hydrated query used by every response ────────────────────────────

  async getHydratedCart(cartId: string) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variation: {
              include: {
                attributes: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: { select: { name: true } },
                      },
                    },
                  },
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    mainImage: true,
                    store: {
                      select: { id: true, name: true, slug: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { addedAt: "asc" },
        },
      },
    });
  }
}
