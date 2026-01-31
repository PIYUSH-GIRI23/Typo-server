import analyticsController from '../controllers/analyticsController.js';
import middleware from '../middleware/middleware.js';
import express from 'express';

const router = express.Router();

router.get('/user-analytics', middleware, analyticsController.getUserAnalytics);
router.get('/account-analytics', middleware, analyticsController.getAccountAnalytics);
router.post('/update-analytics', middleware, analyticsController.updateAnalytics);
router.put('/reset-analytics', middleware, analyticsController.resetAnalytics);

export default router;

