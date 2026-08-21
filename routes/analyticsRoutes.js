import analyticsController from '../controllers/analyticsController.js';
import middleware from '../middleware/middleware.js';
import { redisRateLimiter } from '../middleware/redisRateLimiter.js';
import express from 'express';

const router = express.Router();

const analyticsLimiter = redisRateLimiter({
  route: 'analytics',
  limitEnvVar: 'ANALYTICS_RATE_LIMIT',
  defaultLimit: 20,
  windowSecondsEnvVar: 'RATE_LIMIT_WINDOW_SECONDS',
  defaultWindowSeconds: 60,
  message: 'Too many analytics requests, please try again later.'
});

router.use(analyticsLimiter);

router.get('/user-analytics', middleware, analyticsController.getUserAnalytics);
router.get('/account-analytics', middleware, analyticsController.getAccountAnalytics);
router.put('/update-analytics', middleware, analyticsController.updateAnalytics);
router.put('/reset-analytics', middleware, analyticsController.resetAnalytics);

export default router;


