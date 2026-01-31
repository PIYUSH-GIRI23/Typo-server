import authController from '../controllers/authController.js';
import userController from '../controllers/usernameController.js';
import middleware from '../middleware/middleware.js';
import express from 'express';

const router = express.Router();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

router.get('/check-username', userController.checkUsernameAvailability);
router.put('/update-username', middleware, userController.changeUsername);
router.delete('/delete-account', middleware, userController.deleteAccount);

export default router;