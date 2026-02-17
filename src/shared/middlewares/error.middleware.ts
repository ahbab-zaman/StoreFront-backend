import { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { ZodError } from "zod";

type ErrorWithStatus = {
  status?: number;
  message?: string;
  stack?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorStatus(err: unknown): number {
  if (!isObject(err)) return 500;
  const status = err["status"];
  return typeof status === "number" ? status : 500;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (isObject(err) && typeof err["message"] === "string") return err["message"];
  return "Internal server error!";
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _: NextFunction,
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      error: {
        details: err.issues.map((i) => ({
          field: i.path.join(".") || "body",
          message: i.message,
        })),
      },
    });
  }

  const statusCode = getErrorStatus(err);
  const errorMessage = getErrorMessage(err);

  const payload: {
    success: false;
    message: string;
    error?: unknown;
  } = {
    success: false,
    message: errorMessage,
  };

  if (!env.isProduction) {
    const stack = isObject(err) ? (err as ErrorWithStatus).stack : undefined;
    payload.error = stack ?? err;
  }

  res.status(statusCode).json(payload);
};
