import authController from '../controllers/authController.js';
import passwordController from '../controllers/passwordController.js';
import userController from '../controllers/userController.js';
import middleware from '../middleware/middleware.js';
import { redisRateLimiter } from '../middleware/redisRateLimiter.js';
import express from 'express';

const router = express.Router();

const authLimiter = redisRateLimiter({
  route: 'auth',
  limitEnvVar: 'AUTH_RATE_LIMIT',
  defaultLimit: 5,
  windowSecondsEnvVar: 'RATE_LIMIT_WINDOW_SECONDS',
  defaultWindowSeconds: 60,
  message: 'Too many requests, please try again later.'
});

router.post('/register', authLimiter, authController.registerUser);
router.post('/login', authLimiter, authController.loginUser);

router.post('/send-otp', authLimiter, passwordController.sendOTP);
router.post('/reset-password', authLimiter, passwordController.resetPassword);

router.get('/check-username', userController.checkUsernameAvailability);
router.put('/update-username', middleware, userController.changeUsername);
router.delete('/delete-account', middleware, authLimiter, userController.deleteAccount);

export default router;