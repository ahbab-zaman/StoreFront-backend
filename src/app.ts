import express, { Application, Request, Response } from "express";
import { cors } from "./config/cors";
import { helmet } from "./config/helmet";
import { logger } from "./config/logger";
import { limiter } from "./config/rate-limit";
import { apiRoutes } from "./routes";
import { errorHandler } from "./shared/middlewares/error.middleware";
import { notFound } from "./shared/middlewares/not-found.middleware";
import { auth } from "./modules/auth/auth";
import { toNodeHandler } from "better-auth/node";

import cookieParser from "cookie-parser";

// app initialization
const app: Application = express();

// ⚠️ IMPORTANT: Better Auth handler MUST be registered BEFORE express.json()
// because express.json() consumes the raw body stream, making it unavailable
// for toNodeHandler which needs to read the body itself.
app.all("/api/auth/*splat", (req: Request, res: Response) => {
  if (!auth) {
    return res.status(503).json({ success: false, message: "Auth not ready" });
  }
  return toNodeHandler(auth)(req, res);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Middleware to enforce JSON content-type for API requests
app.use((req, res, next) => {
  const contentType = req.headers["content-type"];

  if (
    req.path.startsWith("/api") &&
    !req.path.startsWith("/api/auth") &&
    req.method === "POST" &&
    !contentType?.includes("multipart/form-data") // Bypass for file uploads
  ) {
    const contentLength = req.headers["content-length"];

    // Skip check if body is empty
    if (!contentLength || contentLength === "0") {
      return next();
    }

    if (!contentType || !contentType.includes("application/json")) {
      return res.status(400).json({
        error: "Invalid Content-Type",
        message:
          "Please ensure you are sending 'application/json'. Check your client headers.",
      });
    }
  }
  next();
});

app.use(cookieParser());

app.use(helmet);
app.use(logger);
app.use(cors);
app.use(limiter);

// trust proxy when behind proxies (load balancers)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Home page route
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    title: "Welcome to your Express app",
    description:
      "Built with StackKit - A production-ready Express template with TypeScript, security, and best practices.",
    version: "1.0.0",
    docs: "https://github.com/tariqul420/stackkit",
  });
});

// API routes
app.use("/api", apiRoutes);

// unhandled routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
