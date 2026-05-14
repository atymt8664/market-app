import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers.x-admin-access-key",
    "req.headers.x-csrf-token",
    "res.headers['set-cookie']",
    "req.body.password",
    "req.body.currentPassword",
    "req.body.newPassword",
    "req.body.token",
    "req.body.secret",
    "req.body.apiKey",
    "req.body.code",
    "req.body.backupCode",
    "req.body.totp",
    "req.body.totpCode",
    "req.body.otpauth",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
