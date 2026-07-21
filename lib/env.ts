import { z } from "zod";

/**
 * An optional env string: undefined if absent OR if the var is set to an
 * empty value (common when copying .env.example without filling in keys).
 */
const optionalEnvString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL is missing or invalid — copy .env.example to .env.local and fill in your Supabase project URL.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing — copy .env.example to .env.local and fill in your Supabase anon key.",
  }),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnvString,
  /** Paystack secret key — server-only, never exposed to the browser */
  PAYSTACK_SECRET_KEY: optionalEnvString,
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Validates required environment variables on first access and caches the
 * result. Throws a readable error (instead of a cryptic Supabase SDK crash)
 * when required configuration is missing.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `  - ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  cached = parsed.data;
  return cached;
}
