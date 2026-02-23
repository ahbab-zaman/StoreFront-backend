import { Router } from "express";
import { StoreController } from "./store.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizeRoles } from "../../middlewares/auth.middleware";
import { Role } from "@prisma/client";

import { upload } from "../../middlewares/upload.middleware";

const router = Router();
const store = new StoreController();

const storeUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

// ─── Public Routes (no auth required) ───────────────────────────────────────

// GET /stores — paginated list of APPROVED stores
router.get("/", store.getPublicStores.bind(store));

// ⚠️ IMPORTANT: /stores/me must be registered BEFORE /stores/:slug
// `/me` would otherwise be captured as a slug parameter.
// GET /stores/me — seller's own store (any status)
router.get(
  "/me",
  authenticate,
  authorizeRoles(Role.SELLER),
  store.getMyStore.bind(store),
);

// GET /stores/:slug — public store detail (APPROVED only)
router.get("/:slug", store.getStoreBySlug.bind(store));

// ─── Seller Routes ───────────────────────────────────────────────────────────
// POST /stores — create a new store
router.post(
  "/",
  authenticate,
  authorizeRoles(Role.SELLER),
  storeUpload,
  store.createStore.bind(store),
);

// PATCH /stores/:id — update own store
router.patch(
  "/:id",
  authenticate,
  authorizeRoles(Role.SELLER),
  storeUpload,
  store.updateStore.bind(store),
);

// PATCH /stores/:id/toggle-open — open or close own store
router.patch(
  "/:id/toggle-open",
  authenticate,
  authorizeRoles(Role.SELLER),
  store.toggleOpen.bind(store),
);

// ─── Admin Routes ────────────────────────────────────────────────────────────

// PATCH /stores/:id/approve — approve a PENDING store
router.patch(
  "/:id/approve",
  authenticate,
  authorizeRoles(Role.ADMIN),
  store.approveStore.bind(store),
);

// PATCH /stores/:id/reject — reject a PENDING store
router.patch(
  "/:id/reject",
  authenticate,
  authorizeRoles(Role.ADMIN),
  store.rejectStore.bind(store),
);

// PATCH /stores/:id/suspend — suspend any store
router.patch(
  "/:id/suspend",
  authenticate,
  authorizeRoles(Role.ADMIN),
  store.suspendStore.bind(store),
);

// DELETE /stores/:id — soft delete a store
router.delete(
  "/:id",
  authenticate,
  authorizeRoles(Role.ADMIN),
  store.softDeleteStore.bind(store),
);

export default router;
