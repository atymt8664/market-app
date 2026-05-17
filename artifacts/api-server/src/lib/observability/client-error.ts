import type { Request, Response } from "express";

export type ClientErrorBody = {
  error: string;
  requestId?: string;
};

export function sendClientError(
  res: Response,
  req: Request,
  statusCode: number,
  message: string,
): void {
  const body: ClientErrorBody = { error: message };
  if (typeof req.id === "string" && req.id.length > 0) {
    body.requestId = req.id;
  }
  res.status(statusCode).json(body);
}

export function productionSafeErrorMessage(err: unknown): string {
  const e = err as { message?: string };
  const msg = typeof e?.message === "string" ? e.message.trim() : "";
  if (
    msg.length > 0 &&
    msg.length < 500 &&
    !/^\s*error\s*:/i.test(msg) &&
    !msg.includes("at ") &&
    !msg.includes(".ts") &&
    !msg.includes(".js:")
  ) {
    return msg;
  }
  return "Request failed";
}
