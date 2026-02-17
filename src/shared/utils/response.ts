import { Response } from "express";

export function success(
  res: Response,
  data: unknown,
  message = "Success",
  meta?: unknown,
) {
  return res.json({ success: true, message, data, meta });
}

export function fail(
  res: Response,
  status = 500,
  message = "Error",
  details?: unknown,
) {
  return res.status(status).json({ success: false, message, details });
}
