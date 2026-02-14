import { Router } from "express";
import { healthRoutes } from "../modules/health/health.route";
const router = Router();

import authRoutes from "../modules/auth/auth.routes";

// versioned API
const v1 = Router();

v1.use("/health", healthRoutes);
v1.use("/auth", authRoutes);

router.use("/v1", v1);

export const apiRoutes = router;
