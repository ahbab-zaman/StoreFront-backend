import { hashValue, compareValue, hashToken } from "../../utils/hash";
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
} from "../../utils/token";
import { sendOTPEmail } from "../../utils/email";
import { Role, OtpType } from "@prisma/client";
import { authRepository } from "./auth.repository";

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    phone?: string;
  }) {
    const existingUser = await authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await hashValue(data.password);

    const user = await authRepository.createUser({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role ?? Role.CUSTOMER,
      phone: data.phone,
    });

    await this.sendOTP(user.email, OtpType.VERIFY_EMAIL);

    return {
      message: "User registered successfully. Please check your email for OTP.",
    };
  }

  async sendOTP(email: string, type: OtpType) {
    const otp = generateOTP();
    const hashedOTP = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await authRepository.createOtp({
      email,
      code: hashedOTP,
      type,
      expiresAt,
    });

    await sendOTPEmail(email, otp);
  }

  async resendOTP(email: string, type: OtpType) {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isBlocked) {
      throw new Error("Account is blocked");
    }

    // Invalidate previous OTPs
    await authRepository.invalidateOtps(email, type);

    await this.sendOTP(email, type);

    return { message: "OTP sent successfully" };
  }

  async verifyOTP(email: string, otp: string, type: OtpType) {
    const otpRecord = await authRepository.findLatestValidOtp(email, type);

    if (!otpRecord) {
      throw new Error("Invalid or expired OTP");
    }

    const isValid = await compareValue(otp, otpRecord.code);
    if (!isValid) {
      throw new Error("Invalid or expired OTP");
    }

    await authRepository.markOtpAsUsed(otpRecord.id);

    if (type === OtpType.VERIFY_EMAIL) {
      await authRepository.updateUserByEmail(email, { isEmailVerified: true });
    }

    return { message: "OTP verified successfully" };
  }

  async login(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await authRepository.findUserByEmail(data.email);

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

      await authRepository.updateUserById(user.id, {
        failedLoginAttempts: attempts,
        lockUntil,
      });

      throw new Error("Invalid credentials");
    }

    await authRepository.updateUserById(user.id, {
      failedLoginAttempts: 0,
      lockUntil: null,
    });

    if (!user.isEmailVerified) {
      await this.sendOTP(user.email, OtpType.VERIFY_EMAIL);
      throw new Error(
        "Please verify your email address before logging in. A new verification OTP has been sent to your email.",
      );
    }

    // Allowed multiple sessions: Removed the active session check

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    const refreshToken = generateRefreshToken();
    // Internal session token for DB uniqueness/tracking (not exposed to clients)
    const sessionToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken); // SHA256

    await authRepository.createSession({
      userId: user.id,
      refreshToken: hashedRefreshToken,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      token: sessionToken,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  async refreshToken(refreshToken: string) {
    const hashedRefreshToken = hashToken(refreshToken);

    const session =
      await authRepository.findSessionByHashedRefreshToken(hashedRefreshToken);

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

    await authRepository.updateSessionById(session.id, {
      refreshToken: newHashedRefreshToken, // Rotation
      updatedAt: new Date(),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const hashedRefreshToken = hashToken(refreshToken);

    await authRepository.revokeSessionsByHashedRefreshToken(hashedRefreshToken);

    return { message: "Logged out successfully" };
  }
}
