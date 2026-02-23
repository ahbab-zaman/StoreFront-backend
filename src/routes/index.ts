import { Router } from "express";
import { healthRoutes } from "../modules/health/health.route";
import authRoutes from "../modules/auth/auth.routes";
import storeRoutes from "../modules/store/store.routes";

const router = Router();

// versioned API
const v1 = Router();

v1.use("/health", healthRoutes);
v1.use("/auth", authRoutes);
v1.use("/stores", storeRoutes);

router.use("/v1", v1);

export const apiRoutes = router;
