import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
};

export type AccessTokenPayload = jwt.JwtPayload & {
  userId: string;
  role: string;
  email: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (!isObject(decoded)) return null;
    if (typeof decoded["userId"] !== "string") return null;
    if (typeof decoded["role"] !== "string") return null;
    if (typeof decoded["email"] !== "string") return null;
    return decoded as AccessTokenPayload;
  } catch {
    return null;
  }
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString("hex");
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
