// ─── Cart Module Types ────────────────────────────────────────────────────────

export interface CartItemAttribute {
  name: string;
  value: string;
}

export interface CartItemProduct {
  id: string;
  name: string;
  slug: string;
  mainImage: string;
}

export interface CartItemStore {
  id: string;
  name: string;
  slug: string;
}

export interface HydratedCartItem {
  id: string;
  variationId: string;
  sku: string;
  quantity: number;
  priceAtAdd: number;
  currentPrice: number;
  isPriceChanged: boolean;
  stock: number;
  image: string | null;
  attributes: CartItemAttribute[];
  product: CartItemProduct;
  store: CartItemStore;
}

export interface HydratedCart {
  id: string;
  userId: string;
  storeId: string | null;
  items: HydratedCartItem[];
  totalItems: number;    // sum of all quantities
  subtotal: number;      // sum of (currentPrice * quantity)
  updatedAt: Date;
}

export interface MergeGuestItem {
  variationId: string;
  quantity: number;
}

export interface SkippedMergeItem {
  variationId: string;
  reason: string;
}

export interface MergeResult {
  mergedCount: number;
  skippedCount: number;
  skippedItems: SkippedMergeItem[];
  cart: HydratedCart;
}
