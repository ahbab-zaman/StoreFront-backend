import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  otpSchema,
  resendOtpSchema,
  refreshTokenSchema,
} from "./auth.validators";
import { Role } from "@prisma/client";
import { ZodError } from "zod";

const authService = new AuthService();

// Helper to format errors consistently
function handleError(res: Response, error: any, defaultStatus = 400) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.issues.map((e: any) => ({
        field: String(e.path?.join?.(".") || "body"),
        message: String(e.message),
      })),
    });
  }
  return res.status(defaultStatus).json({ error: error.message });
}

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register({
        ...data,
        role: data.role as Role,
      });
      res.status(201).json(result);
    } catch (error: any) {
      handleError(res, error);
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp, type } = otpSchema.parse(req.body);
      const result = await authService.verifyOTP(email, otp, type);
      res.status(200).json(result);
    } catch (error: any) {
      handleError(res, error);
    }
  }

  async resendOTP(req: Request, res: Response) {
    try {
      const { email, type } = resendOtpSchema.parse(req.body);
      const result = await authService.resendOTP(email, type);
      res.status(200).json(result);
    } catch (error: any) {
      handleError(res, error);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const { accessToken, refreshToken, sessionToken, user } =
        await authService.login({
          ...data,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        });

      // 1. Access Token Cookie (15m)
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      });

      // 2. Refresh Token Cookie (7d)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // 3. Session Token Cookie (7d)
      res.cookie("sessionToken", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ accessToken, user });
    } catch (error: any) {
      handleError(res, error, 401);
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new Error("Refresh token missing");

      const result = await authService.refreshToken(refreshToken);

      // Update Access Token (15m)
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      });

      // Update Refresh Token (7d)
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ accessToken: result.accessToken });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear all 3 cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.clearCookie("sessionToken");

      res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      handleError(res, error, 500);
    }
  }
}
