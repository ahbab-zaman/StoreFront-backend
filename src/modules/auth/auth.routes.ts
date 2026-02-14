import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authLimiter } from "../../middlewares/rate-limit.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", authLimiter, authController.register);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authLimiter, authController.resendOTP);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

export default router;
