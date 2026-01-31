import AppError from "../error/AppError.js";
import errorHandler from "../error/errorHandler.js";
import passwordHash from "../utils/passwordHash.js";
import jwtHelper from '../auth/jwt.js';
import authService from "../services/auth.service.js";
import { setUsername } from "../redis/user.js";
import { validateLoginInput, validateRegisterInput } from "../utils/authValidation.js";
import { pushMailQueue } from "../queue/mailQueue.js";
import formatDateTime from "../utils/formatDateTIme.js";

const loginUser = async(req, res, next) => {
    try{
        const validation = validateLoginInput(req.body);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const { identifier, password, rememberMe = false } = validation.data;

        const user = await authService.findUserByEmailOrUsername(identifier);
        if (!user) {
            return next(new AppError("Invalid credentials", 401));
        }

        const isMatch = await passwordHash.decryptPassword(password, user.password);
        if (!isMatch) {
            return next(new AppError("Invalid credentials", 401));
        }

        await authService.updateLastLogin(user._id);

        const tokens = jwtHelper.generateTokens({ userId: user._id }, rememberMe);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    email: user.email
                },
                tokens
            }
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};

const registerUser = async(req, res, next) => {
    try{
        const validation = validateRegisterInput(req.body);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const {
            email,
            password,
            confirmPassword,
            firstName,
            lastName,
            username,
            rememberMe = false
        } = validation.data;

        if (password !== confirmPassword) {
            return next(new AppError("Passwords do not match", 400));
        }

        const existingUser = await authService.findUserByEmailOrUsername(email);
        const existingUsername = await authService.findUserByEmailOrUsername(username);

        if (existingUser || existingUsername) {
            return next(new AppError("Email or username already exists", 409));
        }

        const hashedPassword = await passwordHash.encryptPassword(password);

        const user = await authService.createUser({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            username,
            lastLogin: Date.now()
        });

        await setUsername(username);

        await pushMailQueue(email, "signup", formatDateTime(Date.now()), 8);

        const tokens = jwtHelper.generateTokens({ userId: user._id }, rememberMe);

        res.status(201).json({
            success: true,
            data: {
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    email: user.email
                },
                tokens
            }
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};

const authController = {
    loginUser,
    registerUser
};

export default authController;