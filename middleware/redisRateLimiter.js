import { rateLimitCheck } from "../redis/rateLimiter.js";

export const redisRateLimiter = ({
  route = "auth",
  limitEnvVar = "AUTH_RATE_LIMIT",
  defaultLimit = 5,
  windowSecondsEnvVar = "RATE_LIMIT_WINDOW_SECONDS",
  defaultWindowSeconds = 60,
  message = "Too many requests, please try again later.",
} = {}) => {
  return async (req, res, next) => {
    try {
      const envLimit = process.env[limitEnvVar];
      const limit = envLimit ? parseInt(envLimit, 10) : defaultLimit;

      const envWindow = process.env[windowSecondsEnvVar];
      const windowSeconds = envWindow ? parseInt(envWindow, 10) : defaultWindowSeconds;

      const rawIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || req.ip || "unknown";
      const identifier = req.userId ? `user:${req.userId}` : `ip:${rawIp}`;

      const { allowed, ttl } = await rateLimitCheck(identifier, route, limit, windowSeconds);
      if (!allowed) {
        return res.status(429).json({
          success: false,
          error: message,
          retryAfterSeconds: ttl,
        });
      }
      next();
    } catch (err) {
      console.error(`Redis rate limiter error (${route}):`, err);
      next(); // Fail open if an unexpected error occurs
    }
  };
};
