import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CUSTOMER", "SELLER"]).default("CUSTOMER"),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const otpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  type: z.enum(["VERIFY_EMAIL", "LOGIN", "RESET_PASSWORD"]),
});

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  type: z
    .enum(["VERIFY_EMAIL", "LOGIN", "RESET_PASSWORD"])
    .default("VERIFY_EMAIL"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
