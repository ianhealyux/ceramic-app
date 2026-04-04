import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  locked: boolean;
  retryAfter: number;
}

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_KEY_PREFIX = 'lockout:';
const LOCKOUT_DURATION = 60 * 60; // 1 hora en segundos

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[ratelimit] UPSTASH_REDIS_REST_URL o TOKEN no configurados — rate limiting deshabilitado');
    return null;
  }
  return new Redis({ url, token });
}

function createRatelimit(redis: Redis): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:login',
  });
}

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getInstances(): { redis: Redis; ratelimit: Ratelimit } | null {
  if (!redis) {
    redis = createRedis();
    if (redis) ratelimit = createRatelimit(redis);
  }
  return redis && ratelimit ? { redis, ratelimit } : null;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const instances = getInstances();

  // Si Redis no está configurado, permitir el login (graceful degradation)
  if (!instances) {
    return { success: true, locked: false, retryAfter: 0 };
  }

  try {
    const { redis: r, ratelimit: rl } = instances;
    const lockoutKey = `${LOCKOUT_KEY_PREFIX}${ip}`;

    // Verificar lockout primero
    const attempts = await r.get<number>(lockoutKey);
    if (attempts !== null && attempts >= LOCKOUT_THRESHOLD) {
      const ttl = await r.ttl(lockoutKey);
      return { success: false, locked: true, retryAfter: Math.max(ttl, 1) };
    }

    // Sliding window rate limit
    const result = await rl.limit(ip);

    if (!result.success) {
      // Incrementar contador de lockout atómicamente
      const current = await r.incr(lockoutKey);
      // Solo setear TTL en el primer incremento (cuando pasa de no existir a 1)
      if (current === 1) {
        await r.expire(lockoutKey, LOCKOUT_DURATION);
      }

      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return {
        success: false,
        locked: current >= LOCKOUT_THRESHOLD,
        retryAfter: Math.max(retryAfter, 1),
      };
    }

    return { success: true, locked: false, retryAfter: 0 };
  } catch (error) {
    // Si Redis falla, permitir el login pero loguear el error
    console.error('[ratelimit] Error de Redis — permitiendo login:', error);
    return { success: true, locked: false, retryAfter: 0 };
  }
}
