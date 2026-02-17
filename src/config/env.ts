import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth Secrets (required; never default in code)
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),

  // Better Auth (required because server initializes Better Auth)
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  APP_URL: z.string().url("APP_URL must be a valid URL"),

  // Google OAuth (optional depending on deployment)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email (required in production)
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@storefront.com"),

  // CORS (required in production; comma-separated origins)
  CORS_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables. ${details}`);
}

const isProduction = parsed.data.NODE_ENV === "production";

if (isProduction) {
  const missing: string[] = [];
  if (!parsed.data.EMAIL_HOST) missing.push("EMAIL_HOST");
  if (!parsed.data.EMAIL_USER) missing.push("EMAIL_USER");
  if (!parsed.data.EMAIL_PASS) missing.push("EMAIL_PASS");
  if (!parsed.data.CORS_ORIGIN) missing.push("CORS_ORIGIN");
  if (missing.length) {
    throw new Error(
      `Missing required environment variables for production: ${missing.join(", ")}`,
    );
  }
}

const env = {
  port: parsed.data.PORT,
  node_env: parsed.data.NODE_ENV,
  isProduction,

  databaseUrl: parsed.data.DATABASE_URL,

  // Auth Secrets
  jwtSecret: parsed.data.JWT_SECRET,
  refreshTokenSecret: parsed.data.REFRESH_TOKEN_SECRET,

  // Better Auth
  betterAuthSecret: parsed.data.BETTER_AUTH_SECRET,
  betterAuthUrl: parsed.data.BETTER_AUTH_URL,
  appUrl: parsed.data.APP_URL,

  // Google OAuth
  googleClientId: parsed.data.GOOGLE_CLIENT_ID,
  googleClientSecret: parsed.data.GOOGLE_CLIENT_SECRET,

  corsOrigin: parsed.data.CORS_ORIGIN,

  // Email (Nodemailer)
  email: {
    host: parsed.data.EMAIL_HOST,
    port: parsed.data.EMAIL_PORT,
    user: parsed.data.EMAIL_USER,
    pass: parsed.data.EMAIL_PASS,
    from: parsed.data.EMAIL_FROM,
  },
};

export { env };
