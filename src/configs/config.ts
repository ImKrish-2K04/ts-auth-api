import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  MONGODB_URI: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_VERIFY_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAILTRAP_API_TOKEN: z.string().min(1),
  APP_URL: z.url(),
  // GOOGLE_CLIENT_ID: z.string().min(1),
  // GOOGLE_CLIENT_SECRET: z.string().min(1),
  // GOOGLE_REDIRECT_URI: z.url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

let config = EnvSchema.safeParse(process.env);

if (!config.success) {
  console.error(`Invalid env vars:\n${z.prettifyError(config.error)}`);
  process.exit(1);
}

export const env = config.data;
