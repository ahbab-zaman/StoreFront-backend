import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const env = {
  port: Number(process.env.PORT) || 8000,
  node_env: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  // Auth Secrets
  jwtSecret: process.env.JWT_SECRET || "super_secret_jwt_key", // TODO: Move to .env
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET || "super_secret_refresh_key", // TODO: Move to .env

  // Better Auth
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

  // Email (Nodemailer)
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || "noreply@storefront.com",
  },
};

export { env };
