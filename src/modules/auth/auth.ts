import { betterAuth } from "better-auth";
import { sendEmail } from "../../shared/email/email-service";
import {
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} from "../../shared/email/email-templates";
import { prisma } from "../../database/prisma";
import { prismaAdapter } from "better-auth/adapters/prisma";

export async function initAuth() {

return betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.APP_URL!],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
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
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
  },
  rateLimit: {
    window: 10,
    max: 100,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
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
  }
 })
};

export let auth: any = undefined;

export async function setupAuth() {
  auth = await initAuth();
  return auth;
}