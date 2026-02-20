import { Role, AuthProvider } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { generateAccessToken, generateRefreshToken } from "../../utils/token";
import { hashToken } from "../../utils/hash";
import ApiError from "../../shared/errors/api-error";

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleCallbackResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GoogleAuthService {
  /**
   * Handles the post-OAuth callback:
   * 1. Upserts the user (create on first login, find on subsequent logins).
   * 2. Upserts the account link row (provider = "google").
   * 3. Checks if the account is blocked.
   * 4. Creates a new session and issues our own JWT + refresh token pair.
   *
   * All DB writes are wrapped in a transaction to guarantee consistency.
   */
  async handleCallback(
    profile: GoogleProfile,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<GoogleCallbackResult> {
    const { googleId, email, name, picture } = profile;

    const { user, sessionToken, refreshToken } = await prisma.$transaction(
      async (tx) => {
        // ── 1. Upsert user ──────────────────────────────────────────────────
        let user = await tx.user.findUnique({ where: { email } });

        if (!user) {
          // First-time Google login — create the user.
          // Google already verified the email so isEmailVerified = true.
          user = await tx.user.create({
            data: {
              name,
              email,
              role: Role.CUSTOMER,
              isEmailVerified: true,
              provider: AuthProvider.GOOGLE,
              providerId: googleId,
              avatar: picture,
              // password is intentionally omitted (nullable for OAuth users)
            },
          });
        } else {
          // Returning user — keep their existing role; just refresh avatar.
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              avatar: picture ?? user.avatar,
              // Ensure email is marked verified (covers edge case where user
              // registered via email first but never verified).
              isEmailVerified: true,
            },
          });
        }

        // ── 2. Guard: blocked account ────────────────────────────────────────
        if (user.isBlocked) {
          throw new ApiError(
            403,
            "Your account has been blocked. Please contact support.",
          );
        }

        // ── 3. Upsert account link (provider row) ────────────────────────────
        const existingAccount = await tx.account.findFirst({
          where: { userId: user.id, providerId: "google" },
        });

        if (!existingAccount) {
          await tx.account.create({
            data: {
              userId: user.id,
              accountId: googleId,
              providerId: "google",
            },
          });
        }

        // ── 4. Create session ────────────────────────────────────────────────
        const refreshToken = generateRefreshToken();
        const hashedRefreshToken = hashToken(refreshToken);
        // Internal session token for DB uniqueness (not exposed to clients)
        const sessionToken = generateRefreshToken();

        await tx.session.create({
          data: {
            userId: user.id,
            refreshToken: hashedRefreshToken,
            token: sessionToken,
            userAgent,
            ipAddress,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          },
        });

        return { user, sessionToken, refreshToken };
      },
    );

    // ── 5. Issue JWT access token (outside transaction — no DB write) ─────────
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export const googleAuthService = new GoogleAuthService();
