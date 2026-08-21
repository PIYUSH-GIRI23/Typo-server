import { connectRedis } from "../init/redis.js";

export const rateLimitCheck = async (identifier, route = "global", limit = 60, windowSeconds = 60) => {
  if (!identifier) return { allowed: true, ttl: 0 };
  const cleanIdentifier = String(identifier).trim().replace(/[^a-zA-Z0-9_.:-]/g, "");
  const prefix = process.env.REDIS_RATE_LIMIT_KEY_PREFIX || "typo:ratelimit:";
  const key = `${prefix}${route}:${cleanIdentifier}`;

  try {
    const redis = await connectRedis();
    if (!redis) return { allowed: true, ttl: 0 };

    const newCount = await redis.incr(key);
    if (newCount === 1) {
      await redis.expire(key, windowSeconds);
    }
    let ttl = await redis.ttl(key);
    if (ttl < 0) {
      await redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }
    return {
      allowed: newCount <= limit,
      ttl: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (err) {
    console.error(`Redis rate limit check error (${route}):`, err && err.message ? err.message : err);
    return { allowed: true, ttl: 0 };
  }
};
