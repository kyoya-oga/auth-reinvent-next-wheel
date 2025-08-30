import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url()
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getPublicEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Invalid public environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

