import { prisma } from "../../database/prisma";
import { hashValue, compareValue, hashToken } from "../../utils/hash";
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
} from "../../utils/token";
import { sendOTPEmail } from "../../utils/email";
import { Role, OtpType } from "@prisma/client";

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await hashValue(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        phone: data.phone,
        provider: "LOCAL",
      },
    });

    await this.sendOTP(user.email, "VERIFY_EMAIL");

    return {
      message: "User registered successfully. Please check your email for OTP.",
    };
  }

  async sendOTP(email: string, type: string) {
    const otp = generateOTP();
    const hashedOTP = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await (prisma as any).oTP.create({
      data: {
        email,
        code: hashedOTP,
        type: type as OtpType,
        expiresAt,
      },
    });

    await sendOTPEmail(email, otp);
  }

  async resendOTP(email: string, type: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isBlocked) {
      throw new Error("Account is blocked");
    }

    // Invalidate previous OTPs
    await (prisma as any).oTP.updateMany({
      where: { email, type: type as OtpType, isUsed: false },
      data: { isUsed: true },
    });

    await this.sendOTP(email, type);

    return { message: "OTP sent successfully" };
  }

  async verifyOTP(email: string, otp: string, type: string) {
    const otpRecord = await (prisma as any).oTP.findFirst({
      where: {
        email,
        type: type as OtpType,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new Error("Invalid or expired OTP");
    }

    const isValid = await compareValue(otp, otpRecord.code);
    if (!isValid) {
      throw new Error("Invalid or expired OTP");
    }

    await (prisma as any).oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    if (type === "VERIFY_EMAIL") {
      await prisma.user.update({
        where: { email },
        data: { isEmailVerified: true },
      });
    }

    return { message: "OTP verified successfully" };
  }

  async login(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    if (user.isBlocked) {
      throw new Error("Account is blocked");
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      throw new Error("Account is temporarily locked. Try again later.");
    }

    const isPasswordValid = await compareValue(data.password, user.password);
    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntil = user.lockUntil;

      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockUntil } as any,
      });

      throw new Error("Invalid credentials");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockUntil: null } as any,
    });

    if (!user.isEmailVerified) {
      await this.sendOTP(user.email, "VERIFY_EMAIL");
      throw new Error(
        "Please verify your email address before logging in. A new verification OTP has been sent to your email.",
      );
    }

    // Check for existing active session
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSession) {
      throw new Error(
        "User is already logged in. Please logout from other devices first.",
      );
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    const refreshToken = generateRefreshToken();
    const sessionToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken); // SHA256

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: hashedRefreshToken,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        token: sessionToken,
      },
    });

    return {
      accessToken,
      refreshToken,
      sessionToken,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  async refreshToken(refreshToken: string) {
    const hashedRefreshToken = hashToken(refreshToken);

    const session = await prisma.session.findFirst({
      where: {
        refreshToken: hashedRefreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new Error("Invalid or expired refresh token");
    }

    const accessToken = generateAccessToken({
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
    });

    const newRefreshToken = generateRefreshToken();
    const newHashedRefreshToken = hashToken(newRefreshToken);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newHashedRefreshToken, // Rotation
        updatedAt: new Date(),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.session.updateMany({
      where: { refreshToken: hashedRefreshToken },
      data: { isRevoked: true },
    });

    return { message: "Logged out successfully" };
  }
}
