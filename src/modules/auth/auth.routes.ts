import { Router } from "express";
import { AuthController } from "./auth.controller";
import { GoogleAuthController } from "./google-auth.controller";
import { authLimiter } from "../../middlewares/rate-limit.middleware";

const router = Router();
const authController = new AuthController();
const googleAuthController = new GoogleAuthController();

// ── Google OAuth (redirect-based flow) ────────────────────────────────────────
// Step 1: Browser hits this → server redirects to Google consent screen
router.get(
  "/google/initiate",
  authLimiter,
  googleAuthController.googleInitiate.bind(googleAuthController),
);
// Step 2: Google redirects back here with ?code=...&state=...
router.get(
  "/google/callback",
  googleAuthController.googleCallback.bind(googleAuthController),
);

// ── Email / Password ──────────────────────────────────────────────────────────
router.post("/register", authLimiter, authController.register);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authLimiter, authController.resendOTP);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

// ─── Dashboard (Success Page) ────────────────────────────────────────────────
router.get("/dashboard", (req, res) => {
  res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
      <h1 style="color: #22c55e;">Login Successful! ✅</h1>
      <p>Welcome to your StoreFront Dashboard.</p>
      <p style="color: #666;">This is a success message from the backend.</p>
      <a href="/" style="color: #3b82f6; text-decoration: none;">Go to Home</a>
    </div>
  `);
});

export default router;
