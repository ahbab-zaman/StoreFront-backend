import { betterAuth } from "better-auth";
import { sendEmail } from "../../shared/email/email-service";
import {
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} from "../../shared/email/email-templates";
import { prisma } from "../../database/prisma";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../../config/env";

export async function initAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),

    baseURL: env.betterAuthUrl,
    secret: env.betterAuthSecret,
    trustedOrigins: [env.appUrl],
    user: {
      fields: {
        emailVerified: "isEmailVerified",
        image: "avatar",
      },
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "CUSTOMER",
          required: true,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        const { html, text } = getPasswordResetEmailTemplate(user, url);
        await sendEmail({
          to: user.email,
          subject: "Reset Your Password",
          text,
          html,
        });
      },
    },
    socialProviders: {
      google: {
        accessType: "offline",
        prompt: "select_account consent",
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const { html, text } = getVerificationEmailTemplate(user, url);
        await sendEmail({
          to: user.email,
          subject: "Verify Your Email Address",
          text,
          html,
        });
      },
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    rateLimit: {
      window: 10,
      max: 100,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        // Automatically link accounts if the email is verified
        autoLinkWithEmail: true,
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7,
      },
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieName: "better-auth.session_token",
    },
    advanced: {
      useSecureCookies: env.isProduction,
    },
  });
}

export let auth: any = undefined;

export async function setupAuth() {
  auth = await initAuth();
  return auth;
}
