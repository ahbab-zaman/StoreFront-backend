import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
};

export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    return null;
  }
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString("hex");
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
