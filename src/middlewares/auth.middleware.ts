import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token";
import { prisma } from "../database/prisma";
import { Role } from "@prisma/client";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        isBlocked: true,
        isEmailVerified: true,
      },
    });

    if (!user || user.isBlocked) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not found or blocked" });
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      isBlocked: user.isBlocked,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};
