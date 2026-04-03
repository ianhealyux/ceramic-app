import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 5 attempts per IP per 15-minute window
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:login',
});

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_KEY_PREFIX = 'lockout:';
const LOCKOUT_DURATION = 60 * 60; // 1 hour in seconds

export interface RateLimitResult {
  success: boolean;
  locked: boolean;
  retryAfter: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  // Check lockout first
  const lockoutKey = `${LOCKOUT_KEY_PREFIX}${ip}`;
  const attempts = await redis.get<number>(lockoutKey);

  if (attempts !== null && attempts >= LOCKOUT_THRESHOLD) {
    return { success: false, locked: true, retryAfter: LOCKOUT_DURATION };
  }

  // Check sliding window rate limit
  const result = await ratelimit.limit(ip);

  if (!result.success) {
    // Increment lockout counter
    const current = (attempts ?? 0) + 1;
    await redis.set(lockoutKey, current, { ex: LOCKOUT_DURATION });

    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return {
      success: false,
      locked: current >= LOCKOUT_THRESHOLD,
      retryAfter: Math.max(retryAfter, 1),
    };
  }

  return { success: true, locked: false, retryAfter: 0 };
}
