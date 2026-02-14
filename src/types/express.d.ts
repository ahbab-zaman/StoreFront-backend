import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: Role;
        isEmailVerified: boolean;
        isBlocked: boolean;
      };
    }
  }
}

export {};
