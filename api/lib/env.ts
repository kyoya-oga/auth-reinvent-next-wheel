import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SIGNING_KEY: z.string().min(16, 'JWT_SIGNING_KEY should be at least 16 chars'),
  SESSION_COOKIE_NAME: z.string().default('at'),
  REFRESH_COOKIE_NAME: z.string().default('rt'),
  CSRF_COOKIE_NAME: z.string().default('csrf'),
  COOKIE_DOMAIN: z.string().optional()
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

