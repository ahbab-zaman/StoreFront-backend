import { prisma } from "../../database/prisma";
import { OtpType, Prisma, Role } from "@prisma/client";

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
};

export type CreateSessionInput = {
  userId: string;
  refreshToken: string; // hashed
  token: string; // internal session token
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};

export type CreateOtpInput = {
  email: string;
  code: string; // hashed
  type: OtpType;
  expiresAt: Date;
};

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  createUser(data: CreateUserInput) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        phone: data.phone,
        provider: "LOCAL",
      },
    });
  }

  updateUserById(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  updateUserByEmail(email: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { email },
      data,
    });
  }

  findActiveSessionByUserId(userId: string) {
    return prisma.session.findFirst({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  createSession(data: CreateSessionInput) {
    return prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        token: data.token,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  findSessionByHashedRefreshToken(refreshToken: string) {
    return prisma.session.findFirst({
      where: {
        refreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  updateSessionById(sessionId: string, data: Prisma.SessionUpdateInput) {
    return prisma.session.update({
      where: { id: sessionId },
      data,
    });
  }

  revokeSessionsByHashedRefreshToken(refreshToken: string) {
    return prisma.session.updateMany({
      where: { refreshToken },
      data: { isRevoked: true },
    });
  }

  createOtp(data: CreateOtpInput) {
    return prisma.oTP.create({
      data: {
        email: data.email,
        code: data.code,
        type: data.type,
        expiresAt: data.expiresAt,
      },
    });
  }

  findLatestValidOtp(email: string, type: OtpType) {
    return prisma.oTP.findFirst({
      where: {
        email,
        type,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  markOtpAsUsed(otpId: string) {
    return prisma.oTP.update({
      where: { id: otpId },
      data: { isUsed: true },
    });
  }

  invalidateOtps(email: string, type: OtpType) {
    return prisma.oTP.updateMany({
      where: { email, type, isUsed: false },
      data: { isUsed: true },
    });
  }
}

export const authRepository = new AuthRepository();

