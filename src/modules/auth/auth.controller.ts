import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { registerSchema, loginSchema, otpSchema, resendOtpSchema } from "./auth.validators";
import { OtpType, Role } from "@prisma/client";
import { env } from "../../config/env";
import { success } from "../../shared/utils/response";

const authService = new AuthService();

function httpError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register({
        ...data,
        // Never trust client role on public registration
        role: Role.CUSTOMER,
      });
      return success(res, result, "User registered successfully");
    } catch (err) {
      return next(err);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, type } = otpSchema.parse(req.body);
      const result = await authService.verifyOTP(email, otp, type as OtpType);
      return success(res, result, "OTP verified successfully");
    } catch (err) {
      return next(err);
    }
  }

  async resendOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, type } = resendOtpSchema.parse(req.body);
      const result = await authService.resendOTP(email, type as OtpType);
      return success(res, result, "OTP sent successfully");
    } catch (err) {
      return next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const { accessToken, refreshToken, user } =
        await authService.login({
          ...data,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        });

      // 1. Access Token Cookie (15m)
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      });

      // 2. Refresh Token Cookie (7d)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Do not return tokens in JSON responses (httpOnly cookies only)
      return success(res, { user }, "Login successful");
    } catch (err) {
      return next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken as string | undefined;
      if (!refreshToken) throw httpError(401, "Refresh token missing");

      const result = await authService.refreshToken(refreshToken);

      // Update Access Token (15m)
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      });

      // Update Refresh Token (7d)
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return success(res, {}, "Token refreshed successfully");
    } catch (err) {
      return next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken as string | undefined;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear auth cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return success(res, {}, "Logged out successfully");
    } catch (err) {
      return next(err);
    }
  }
}
